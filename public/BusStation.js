// Represents a travel origin/destination option shown in the planning UI.
export default class BusStation {
  constructor(name, cityOrLatitude, stateOrLongitude, latitude, longitude) {
    this.name = name;

    if (typeof cityOrLatitude === "number" && typeof stateOrLongitude === "number") {
      this.city = "";
      this.state = "";
      this.latitude = cityOrLatitude;
      this.longitude = stateOrLongitude;
    } else {
      this.city = cityOrLatitude ?? "";
      this.state = stateOrLongitude ?? "";
      this.latitude = latitude;
      this.longitude = longitude;
    }

    this.validated = false;
  }

  addStation(stationList) {
    if (this.validateBusStationInput()) {
      stationList.push(this);
      return true;
    }
    return false;
  }

  displayStationInfo() {
    const location = this.city && this.state ? ` | ${this.city}, ${this.state}` : "";
    return `${this.name}${location} | Latitude: ${this.latitude} | Longitude: ${this.longitude}`;
  }

  deleteStation(stationList) {
    const index = stationList.indexOf(this);
    if (index !== -1) {
      stationList.splice(index, 1);
      return true;
    }
    return false;
  }

  modifyStation(updatedData = {}) {
    this.name = updatedData.name ?? this.name;
    this.city = updatedData.city ?? this.city;
    this.state = updatedData.state ?? this.state;
    this.latitude = updatedData.latitude ?? this.latitude;
    this.longitude = updatedData.longitude ?? this.longitude;
    return this.validateBusStationInput();
  }

  validateBusStationInput() {
    const validName =
      typeof this.name === "string" &&
      this.name.trim().length >= 3 &&
      this.name.trim().length <= 60;

    // Latitude is measured on a sphere from -90 to +90 degrees.
    const validLatitude =
      typeof this.latitude === "number" &&
      this.latitude >= -90 &&
      this.latitude <= 90;

    // Longitude wraps around Earth from -180 to +180 degrees.
    const validLongitude =
      typeof this.longitude === "number" &&
      this.longitude >= -180 &&
      this.longitude <= 180;

    this.validated = validName && validLatitude && validLongitude;
    return this.validated;
  }
}