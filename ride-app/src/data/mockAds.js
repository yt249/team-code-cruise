// Mock advertisement data
export const mockAds = [
  {
    id: 'ad-1',
    advertiser: 'TechCorp',
    title: 'New Smartphone Launch',
    duration: 30, // seconds
    discountPercentage: 12,
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', // Sample video
    thumbnailUrl: 'https://via.placeholder.com/640x360/4A90E2/FFFFFF?text=TechCorp+Ad',
    description: 'Watch this ad to save 12% on your ride!'
  },
  {
    id: 'ad-2',
    advertiser: 'FoodDelivery Plus',
    title: 'Get 20% Off Your Next Order',
    duration: 45,
    discountPercentage: 15,
    videoUrl: 'https://www.w3schools.com/html/movie.mp4',
    thumbnailUrl: 'https://via.placeholder.com/640x360/E27D60/FFFFFF?text=FoodDelivery+Ad',
    description: 'Watch this ad to save 15% on your ride!'
  },
  {
    id: 'ad-3',
    advertiser: 'Fitness Center',
    title: 'Join Our Gym Today',
    duration: 35,
    discountPercentage: 10,
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    thumbnailUrl: 'https://via.placeholder.com/640x360/85CDCA/FFFFFF?text=Fitness+Ad',
    description: 'Watch this ad to save 10% on your ride!'
  }
];

// Function to get a random ad
export function getRandomAd() {
  return mockAds[Math.floor(Math.random() * mockAds.length)];
}

// Function to calculate discount amount
export function calculateDiscountAmount(baseFare, discountPercentage) {
  return (baseFare * discountPercentage) / 100;
}
