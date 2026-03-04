function calculatePrice(weight) {
  const basePrice = 1000; 
  const pricePerKg = 500; 
  return basePrice + (weight * pricePerKg);
}

module.exports = { calculatePrice };