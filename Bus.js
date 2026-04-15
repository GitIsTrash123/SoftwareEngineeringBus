export default class Bus {
  constructor(make, model, busType, fuelCapacity, mpg, speed, fuelType) {
    this.make = make;
    this.model = model;
    this.busType = busType;       // "City Bus" or "Long Distance Bus"
    this.fuelCapacity = fuelCapacity; // gallons
    this.mpg = mpg;               // miles per gallon (representative)
    this.speed = speed;
    this.fuelType = fuelType;     // "unleaded" or "diesel"
  }

  busString() {
    const range = (this.fuelCapacity * this.mpg).toFixed(0);
    return `${this.make} ${this.model} | Type: ${this.busType} | Tank: ${this.fuelCapacity} gal | MPG: ${this.mpg} | Range: ~${range} mi | Speed: ${this.speed} mph | Fuel: ${this.fuelType}`;
  }

  addBus(busList) {
    busList.push(this);
  }

  displayBusInfo() {
    return this.busString();
  }

  deleteBus(busList) {
    const index = busList.indexOf(this);
    if (index !== -1) {
      busList.splice(index, 1);
      return true;
    }
    return false;
  }

  modifyBus(updatedData = {}) {
    this.make = updatedData.make ?? this.make;
    this.model = updatedData.model ?? this.model;
    this.busType = updatedData.busType ?? this.busType;
    this.fuelCapacity = updatedData.fuelCapacity ?? this.fuelCapacity;
    this.mpg = updatedData.mpg ?? this.mpg;
    this.speed = updatedData.speed ?? this.speed;
    this.fuelType = updatedData.fuelType ?? this.fuelType;
  }
}