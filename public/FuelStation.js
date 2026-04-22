// Represents a compatible fuel stop that can be suggested during route planning.
export default class FuelStation {
  constructor(name, cityOrLatitude, stateOrLongitude, latitudeOrFuelType, longitude, fuelType) {
    this.name = name;

    if (typeof cityOrLatitude === "number" && typeof stateOrLongitude === "number") {
      this.city = "";
      this.state = "";
      this.latitude = cityOrLatitude;
      this.longitude = stateOrLongitude;
      this.fuelType = latitudeOrFuelType;
    } else {
      this.city = cityOrLatitude ?? "";
      this.state = stateOrLongitude ?? "";
      this.latitude = latitudeOrFuelType;
      this.longitude = longitude;
      this.fuelType = fuelType;
    }

    this.selectedGrade = this.fuelType; // compatibility with existing code
  }

  displayFuelStationInfo() {
    const location = this.city && this.state ? ` | ${this.city}, ${this.state}` : "";
    return `${this.name}${location} | Latitude: ${this.latitude} | Longitude: ${this.longitude} | Fuel Type: ${this.fuelType}`;
  }

  refuelBus(bus) {
    // Fuel stop eligibility is a strict match; range arithmetic is computed in TravelPlan.
    if (this.fuelType === bus.fuelType) {
      return `Fuel matched. ${bus.make} ${bus.model} restored to full tank.`;
    }
    return "Wrong fuel type. Please try again.";
  }
}