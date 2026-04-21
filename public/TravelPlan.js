import { firestoreDb, firebaseCollections, firebaseAuth } from "./FirebaseService.js";
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export default class TravelPlan {
  constructor(startingPoint, destination, bus, fuelStation = null) {
    this.startingPoint = startingPoint;
    this.destination = destination;
    this.bus = bus;
    this.fuelStation = fuelStation;
    this.distance = this.calculateDistance();
    this.time = this.calculateTime();
  }

  serializeStation(station) {
    if (!station) {
      return null;
    }

    return {
      name: station.name || "",
      city: station.city || "",
      state: station.state || "",
      latitude: Number(station.latitude || 0),
      longitude: Number(station.longitude || 0)
    };
  }

  serializeBus(bus) {
    if (!bus) {
      return null;
    }

    return {
      make: bus.make || "",
      model: bus.model || "",
      busType: bus.busType || "",
      fuelCapacity: Number(bus.fuelCapacity || 0),
      mpg: Number(bus.mpg || 0),
      speed: Number(bus.speed || 0),
      fuelType: bus.fuelType || ""
    };
  }

  serializeFuelStop(stop) {
    if (!stop) {
      return null;
    }

    return {
      name: stop.name || "",
      city: stop.city || "",
      state: stop.state || "",
      latitude: Number(stop.latitude || 0),
      longitude: Number(stop.longitude || 0),
      fuelType: stop.fuelType || ""
    };
  }

  sanitizeForFirestore(value) {
    if (value === null) {
      return null;
    }

    if (value === undefined) {
      return null;
    }

    const valueType = typeof value;
    if (valueType === "string" || valueType === "boolean") {
      return value;
    }

    if (valueType === "number") {
      return Number.isFinite(value) ? value : 0;
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => this.sanitizeForFirestore(item))
        .filter((item) => item !== undefined);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (valueType === "object") {
      const sanitized = {};
      Object.entries(value).forEach(([key, nestedValue]) => {
        if (typeof nestedValue === "function" || typeof nestedValue === "undefined") {
          return;
        }

        sanitized[key] = this.sanitizeForFirestore(nestedValue);
      });
      return sanitized;
    }

    return null;
  }

  buildFirestorePlanPayload(plan = {}) {
    const normalized = this.normalizePlanRecord(plan);

    const payload = {
      userId: normalized.userId || null,
      username: normalized.username || "",
      roleAtCreation: normalized.roleAtCreation || "user",
      createdAt: normalized.createdAt || new Date().toISOString(),
      updatedAt: normalized.updatedAt || new Date().toISOString(),
      distance: Number(normalized.distance || 0),
      time: Number(normalized.time || 0),
      estimatedRange: Number(normalized.estimatedRange || 0),
      needsFuelStop: Boolean(normalized.needsFuelStop),
      summary: normalized.summary || "",
      tripClass: normalized.tripClass || "short",
      overallDirection: normalized.overallDirection || "Local",
      segmentCount: Number(normalized.segmentCount || 0),
      busChangeCount: Number(normalized.busChangeCount || 0),
      sightseeingStopCount: Number(normalized.sightseeingStopCount || 0),
      startingPoint: this.serializeStation(normalized.startingPoint),
      destination: this.serializeStation(normalized.destination),
      bus: this.serializeBus(normalized.bus),
      fuelStation: this.serializeFuelStop(normalized.fuelStation),
      fuelStops: Array.isArray(normalized.fuelStops)
        ? normalized.fuelStops.map((stop) => this.serializeFuelStop(stop)).filter(Boolean)
        : [],
      segments: Array.isArray(normalized.segments)
        ? normalized.segments.map((segment, index) => ({
          id: segment.id || `segment-${index + 1}`,
          order: Number(segment.order || index + 1),
          distance: Number(segment.distance || 0),
          time: Number(segment.time || 0),
          direction: segment.direction || "Local",
          tripClass: segment.tripClass || "short",
          needsFuelStop: Boolean(segment.needsFuelStop),
          busChange: Boolean(segment.busChange),
          startingPoint: this.serializeStation(segment.startingPoint),
          destination: this.serializeStation(segment.destination),
          bus: this.serializeBus(segment.bus),
          stops: Array.isArray(segment.stops)
            ? segment.stops.map((stop) => this.sanitizeForFirestore(this.normalizeStop(stop))).filter(Boolean)
            : []
        }))
        : []
    };

    return this.sanitizeForFirestore(payload);
  }

  normalizeStop(stop = {}, index = 0) {
    const coordinates = stop.coordinates || stop;

    return {
      id: stop.id || `stop-${index + 1}`,
      order: Number.isFinite(stop.order) ? stop.order : index + 1,
      stopType: stop.stopType || stop.type || "layover",
      duration: Number(stop.duration || 0),
      notes: stop.notes || "",
      coordinates: {
        latitude: Number(coordinates.latitude || 0),
        longitude: Number(coordinates.longitude || 0)
      },
      name: stop.name || stop.locationName || ""
    };
  }

  normalizeSegment(segment = {}, index = 0) {
    const rawStops = Array.isArray(segment.stops)
      ? segment.stops
      : [];

    const stops = rawStops.map((stop, stopIndex) => this.normalizeStop(stop, stopIndex));
    const distance = Number(Number(segment.distance ?? 0).toFixed(2));
    const time = Number(Number(segment.time ?? 0).toFixed(2));

    return {
      id: segment.id || `segment-${index + 1}`,
      order: Number.isFinite(segment.order) ? segment.order : index + 1,
      startingPoint: segment.startingPoint || null,
      destination: segment.destination || null,
      bus: segment.bus || null,
      distance,
      time,
      direction: segment.direction || "Local",
      tripClass: segment.tripClass || "short",
      needsFuelStop: typeof segment.needsFuelStop === "boolean"
        ? segment.needsFuelStop
        : stops.some((stop) => stop.stopType === "fuel"),
      busChange: Boolean(segment.busChange),
      stops
    };
  }

  buildFallbackSegments(plan = {}) {
    const fuelStops = Array.isArray(plan.fuelStops) ? plan.fuelStops : [];
    const stops = fuelStops.map((stop, index) => this.normalizeStop({
      ...stop,
      id: `segment-1-stop-${index + 1}`,
      order: index + 1,
      stopType: "fuel",
      duration: stop.duration || 0,
      notes: stop.notes || "Auto-selected fuel stop",
      coordinates: {
        latitude: stop.latitude,
        longitude: stop.longitude
      },
      name: stop.name || ""
    }, index));

    return [this.normalizeSegment({
      id: "segment-1",
      order: 1,
      startingPoint: plan.startingPoint || this.startingPoint,
      destination: plan.destination || this.destination,
      bus: plan.bus || this.bus,
      distance: plan.distance ?? this.distance,
      time: plan.time ?? this.time,
      direction: plan.overallDirection || "Local",
      tripClass: plan.tripClass || "short",
      needsFuelStop: typeof plan.needsFuelStop === "boolean" ? plan.needsFuelStop : fuelStops.length > 0,
      busChange: false,
      stops
    })];
  }

  normalizePlanRecord(plan = {}) {
    const segments = Array.isArray(plan.segments) && plan.segments.length
      ? plan.segments.map((segment, index) => this.normalizeSegment(segment, index))
      : this.buildFallbackSegments(plan);

    const segmentCount = segments.length;
    const totalDistance = Number((plan.distance ?? segments.reduce((sum, segment) => sum + segment.distance, 0)).toFixed(2));
    const totalTime = Number((plan.time ?? segments.reduce((sum, segment) => sum + segment.time, 0)).toFixed(2));
    const sightseeingStopCount = typeof plan.sightseeingStopCount === "number"
      ? plan.sightseeingStopCount
      : segments.reduce((count, segment) => count + segment.stops.filter((stop) => stop.stopType === "sightseeing").length, 0);
    const busChangeCount = typeof plan.busChangeCount === "number"
      ? plan.busChangeCount
      : segments.filter((segment) => segment.busChange).length;

    return {
      ...plan,
      distance: totalDistance,
      time: totalTime,
      overallDirection: plan.overallDirection || segments[0]?.direction || "Local",
      segmentCount: typeof plan.segmentCount === "number" ? plan.segmentCount : segmentCount,
      busChangeCount,
      sightseeingStopCount,
      segments,
      needsFuelStop: typeof plan.needsFuelStop === "boolean"
        ? plan.needsFuelStop
        : segments.some((segment) => segment.needsFuelStop),
      fuelStops: Array.isArray(plan.fuelStops) ? plan.fuelStops : []
    };
  }

  // =========================
  // Travel Calculations
  // =========================

  calculateDistance() {
    const toRad = (deg) => deg * (Math.PI / 180);
    const R = 3958.8;

    const lat1 = toRad(this.startingPoint.latitude);
    const lat2 = toRad(this.destination.latitude);
    const dLat = toRad(this.destination.latitude - this.startingPoint.latitude);
    const dLon = toRad(this.destination.longitude - this.startingPoint.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Number((R * c).toFixed(2));
  }

  calculateTime() {
    if (!this.bus || !this.bus.speed || this.bus.speed <= 0) {
      return 0;
    }
    return Number((this.distance / this.bus.speed).toFixed(2));
  }

  checkFuelCapacity() {
    if (!this.bus || !this.bus.fuelCapacity || !this.bus.mpg) {
      return false;
    }

    const estimatedRange = this.bus.fuelCapacity * this.bus.mpg;
    return estimatedRange >= this.distance;
  }

  needsFuelStop() {
    return !this.checkFuelCapacity();
  }

  travelSummary() {
    let output = `Departing from: ${this.startingPoint.name}\n`;

    if (this.needsFuelStop() && this.fuelStation) {
      output += `Next stop: ${this.fuelStation.name}\n`;
      output += `Final stop: ${this.destination.name}\n`;
    } else {
      output += `Next stop: ${this.destination.name}\n`;
    }

    output += `Traveling ${this.distance} miles in about ${this.time} hours using ${this.bus.make} ${this.bus.model}.`;

    return output;
  }

  // =========================
  // Plan Construction
  // =========================

  toJSON() {
    const currentUser = localStorage.getItem("currentUser");
    const currentRole = localStorage.getItem("currentRole") || "user";
    const currentAuthUser = firebaseAuth.currentUser;
    const currentUserId = currentAuthUser ? currentAuthUser.uid : null;
    const estimatedRange = this.bus.fuelCapacity * this.bus.mpg;

    return this.normalizePlanRecord({
      id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      userId: currentUserId,
      username: currentUser || "guest",
      roleAtCreation: currentRole,
      createdAt: new Date().toLocaleString(),
      startingPoint: this.startingPoint,
      destination: this.destination,
      bus: this.bus,
      fuelStation: this.fuelStation,
      distance: this.distance,
      time: this.time,
      estimatedRange,
      needsFuelStop: this.needsFuelStop(),
      summary: this.travelSummary(),
      tripClass: "short",
      overallDirection: "Local",
      segmentCount: 1,
      busChangeCount: 0,
      sightseeingStopCount: 0,
      fuelStops: [],
      segments: []
    });
  }

  async savePlan() {
    const currentUser = localStorage.getItem("currentUser");
    const currentAuthUser = firebaseAuth.currentUser;
    let planForFirestore = null;

    console.info("[DEBUG][TravelPlan] Save requested", {
      localUser: currentUser || null,
      authUid: currentAuthUser?.uid || null
    });

    if (!currentUser || !currentAuthUser) {
      console.warn("[DEBUG][TravelPlan] Save blocked: missing Firebase Auth session", {
        localUser: currentUser || null,
        authUid: currentAuthUser?.uid || null
      });
      return {
        success: false,
        message: "You must be logged in with Firebase Auth to save a travel plan."
      };
    }

    try {
      const timestamp = new Date().toISOString();
      const newPlan = this.toJSON();
      newPlan.userId = currentAuthUser.uid;
      newPlan.username = currentUser;
      newPlan.createdAt = timestamp;
      newPlan.updatedAt = timestamp;

      planForFirestore = this.buildFirestorePlanPayload(newPlan);
      console.info("[DEBUG][TravelPlan] Writing Firestore doc", {
        collection: firebaseCollections.travelPlans,
        userId: planForFirestore.userId,
        username: planForFirestore.username,
        distance: planForFirestore.distance,
        time: planForFirestore.time
      });

      const docRef = await addDoc(
        collection(firestoreDb, firebaseCollections.travelPlans),
        planForFirestore
      );

      console.info("[DEBUG][TravelPlan] Firestore write success", {
        docId: docRef.id,
        userId: planForFirestore.userId
      });

      return {
        success: true,
        message: "Travel plan saved successfully.",
        plan: {
          id: docRef.id,
          ...planForFirestore
        }
      };
    } catch (error) {
      console.error("[DEBUG][TravelPlan] Firestore write failed", {
        code: error?.code,
        message: error?.message,
        payload: planForFirestore
      });

      if (error?.code === "permission-denied") {
        return {
          success: false,
          message: "Firestore denied write (permission-denied). Verify Auth session and firestore.rules."
        };
      }

      return {
        success: false,
        message: `Unable to save travel plan right now (${error?.code || "unknown"}). Please try again.`
      };
    }
  }

  async getSavedPlans() {
    try {
      const snapshot = await getDocs(collection(firestoreDb, firebaseCollections.travelPlans));

      return snapshot.docs.map((entry) => this.normalizePlanRecord({
        id: entry.id,
        ...entry.data()
      }));
    } catch (_error) {
      return [];
    }
  }

  async getPlansForCurrentUser() {
    const currentAuthUser = firebaseAuth.currentUser;
    if (!currentAuthUser) return [];

    try {
      const userPlansQuery = query(
        collection(firestoreDb, firebaseCollections.travelPlans),
        where("userId", "==", currentAuthUser.uid)
      );
      const snapshot = await getDocs(userPlansQuery);

      return snapshot.docs.map((entry) => this.normalizePlanRecord({
        id: entry.id,
        ...entry.data()
      }));
    } catch (_error) {
      return [];
    }
  }

  async getAllPlansForAdmin() {
    const currentRole = localStorage.getItem("currentRole");
    if (currentRole !== "admin") return [];

    return this.getSavedPlans();
  }

  async editPlan(planId, updates = {}) {
    const currentRole = localStorage.getItem("currentRole");
    const currentAuthUser = firebaseAuth.currentUser;

    if (!planId || typeof planId !== "string" || !planId.trim()) {
      console.error("[DEBUG][TravelPlan] Invalid planId for update", { planId });
      return {
        success: false,
        message: "Invalid planId for update"
      };
    }

    const planRef = doc(firestoreDb, firebaseCollections.travelPlans, planId);
    const existingPlanSnapshot = await getDoc(planRef);

    if (!existingPlanSnapshot.exists()) {
      return {
        success: false,
        message: "Travel plan not found."
      };
    }

    const existingPlan = this.normalizePlanRecord({
      id: planId,
      ...existingPlanSnapshot.data()
    });

    if (currentRole !== "admin" && (!currentAuthUser || existingPlan.userId !== currentAuthUser.uid)) {
      return {
        success: false,
        message: "You can only edit your own travel plans."
      };
    }

    const updatedPlan = this.normalizePlanRecord(existingPlan);
    Object.entries(updates || {}).forEach(([key, value]) => {
      updatedPlan[key] = value;
    });
    updatedPlan.id = existingPlan.id;
    updatedPlan.userId = existingPlan.userId;
    updatedPlan.username = existingPlan.username;
    updatedPlan.roleAtCreation = existingPlan.roleAtCreation;
    updatedPlan.createdAt = existingPlan.createdAt;
    updatedPlan.updatedAt = new Date().toISOString();

    try {
      const updatePayload = this.buildFirestorePlanPayload(updatedPlan);
      console.info("[DEBUG][TravelPlan] editPlan updateDoc payload", {
        planId,
        updatePayload
      });

      await updateDoc(planRef, updatePayload);

      console.info("[DEBUG][TravelPlan] editPlan update success", { planId });

      return {
        success: true,
        message: "Travel plan updated successfully.",
        plan: {
          id: planId,
          ...updatePayload
        }
      };
    } catch (error) {
      console.error("[DEBUG][TravelPlan] editPlan update failed", {
        planId,
        code: error?.code,
        message: error?.message
      });

      return {
        success: false,
        message: error?.message || "Unable to update travel plan right now. Please try again."
      };
    }
  }

  async deletePlan(planId) {
    const currentRole = localStorage.getItem("currentRole");
    const currentAuthUser = firebaseAuth.currentUser;

    const plans = await this.getSavedPlans();
    const foundPlan = plans.find((plan) => plan.id === planId);

    if (!foundPlan) {
      return {
        success: false,
        message: "Travel plan not found."
      };
    }

    if (currentRole !== "admin" && (!currentAuthUser || foundPlan.userId !== currentAuthUser.uid)) {
      return {
        success: false,
        message: "You can only delete your own travel plans."
      };
    }

    try {
      await deleteDoc(doc(firestoreDb, firebaseCollections.travelPlans, planId));

      return {
        success: true,
        message: "Travel plan deleted successfully."
      };
    } catch (_error) {
      return {
        success: false,
        message: "Unable to delete travel plan right now. Please try again."
      };
    }
  }
}