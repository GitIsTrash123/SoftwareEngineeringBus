export default class TravelPlan {
  constructor(startingPoint, destination, bus, fuelStation = null) {
    this.startingPoint = startingPoint;
    this.destination = destination;
    this.bus = bus;
    this.fuelStation = fuelStation;
    this.distance = this.calculateDistance();
    this.time = this.calculateTime();
    this.storageKey = "travelPlans";
  }

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

  toJSON() {
    const currentUser = localStorage.getItem("currentUser");
    const currentRole = localStorage.getItem("currentRole") || "user";
    const estimatedRange = this.bus.fuelCapacity * this.bus.mpg;

    return {
      id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
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
      routeMode: "straight",
      tripClass: "short",
      fuelStops: []
    };
  }

  savePlan() {
    const currentUser = localStorage.getItem("currentUser");

    if (!currentUser) {
      return {
        success: false,
        message: "You must be logged in to save a travel plan."
      };
    }

    const plans = this.getSavedPlans();
    const newPlan = this.toJSON();

    plans.push(newPlan);
    localStorage.setItem(this.storageKey, JSON.stringify(plans));

    return {
      success: true,
      message: "Travel plan saved successfully.",
      plan: newPlan
    };
  }

  getSavedPlans() {
    const plans = localStorage.getItem(this.storageKey);
    return plans ? JSON.parse(plans) : [];
  }

  getPlansForCurrentUser() {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) return [];

    return this.getSavedPlans().filter((plan) => plan.username === currentUser);
  }

  getAllPlansForAdmin() {
    const currentRole = localStorage.getItem("currentRole");
    if (currentRole !== "admin") return [];

    return this.getSavedPlans();
  }

  editPlan(planId, updates = {}) {
    const currentUser = localStorage.getItem("currentUser");
    const currentRole = localStorage.getItem("currentRole");

    const plans = this.getSavedPlans();
    const index = plans.findIndex((plan) => plan.id === planId);

    if (index === -1) {
      return {
        success: false,
        message: "Travel plan not found."
      };
    }

    const existingPlan = plans[index];

    if (currentRole !== "admin" && existingPlan.username !== currentUser) {
      return {
        success: false,
        message: "You can only edit your own travel plans."
      };
    }

    const updatedPlan = {
      ...existingPlan,
      ...updates,
      id: existingPlan.id,
      username: existingPlan.username,
      roleAtCreation: existingPlan.roleAtCreation,
      createdAt: existingPlan.createdAt
    };

    plans[index] = updatedPlan;
    localStorage.setItem(this.storageKey, JSON.stringify(plans));

    return {
      success: true,
      message: "Travel plan updated successfully.",
      plan: updatedPlan
    };
  }

  deletePlan(planId) {
    const currentUser = localStorage.getItem("currentUser");
    const currentRole = localStorage.getItem("currentRole");

    const plans = this.getSavedPlans();
    const foundPlan = plans.find((plan) => plan.id === planId);

    if (!foundPlan) {
      return {
        success: false,
        message: "Travel plan not found."
      };
    }

    if (currentRole !== "admin" && foundPlan.username !== currentUser) {
      return {
        success: false,
        message: "You can only delete your own travel plans."
      };
    }

    const updatedPlans = plans.filter((plan) => plan.id !== planId);
    localStorage.setItem(this.storageKey, JSON.stringify(updatedPlans));

    return {
      success: true,
      message: "Travel plan deleted successfully."
    };
  }
}