# RideShare Application

A modern, responsive ride-sharing application built with React that demonstrates core booking flow and advertisement discount features.

## Features

### User Story #1: Core Ride Booking
- **Location Input**: Enter pickup and destination locations
- **Fare Quote**: Get instant fare estimates with distance and ETA
- **Driver Assignment**: Automatic driver matching with real-time tracking
- **Trip Tracking**: Live driver location updates and trip progress
- **Payment**: Multiple payment methods with tipping options
- **Receipt**: Detailed trip receipt with all charges

### User Story #3: Advertisement Discount
- **Ad Offer**: Optional advertisement viewing for 10-15% discount
- **Video Player**: Smooth video playback with progress tracking
- **Skip Option**: Ability to skip after watching portion of ad
- **Discount Application**: Automatic fare reduction when ad is completed
- **Visual Feedback**: Clear indication of savings throughout booking

## Technology Stack

- **Frontend**: React 19
- **Build Tool**: Vite
- **State Management**: React Context API
- **Styling**: CSS with CSS Variables
- **Mock Data**: Simulated backend with realistic delays

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd frontend
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

4. Open your browser to [http://localhost:5173](http://localhost:5173)

### Testing the Application

#### Quick Test Flow
1. Enter "here" for pickup and "there" for destination
2. Click "Get Fare Quote"
3. (Optional) Click "Watch Ad" to see ad discount feature
4. Click "Confirm Booking"
5. Wait for driver assignment (automatic)
6. Click "Start Trip" when driver arrives
7. Wait for trip completion (automatic)
8. Select payment method and add tip
9. Click "Complete Payment" to see receipt

## Project Structure

\`\`\`
frontend/
├── src/
│   ├── components/
│   │   ├── booking/
│   │   │   ├── BookingUI.jsx       # Booking flow component
│   │   │   └── BookingUI.css
│   │   ├── ad/
│   │   │   ├── AdDiscountUI.jsx    # Ad discount component
│   │   │   └── AdDiscountUI.css
│   │   ├── tracking/
│   │   │   ├── DriverTrackingUI.jsx # Driver tracking component
│   │   │   └── DriverTrackingUI.css
│   │   └── payment/
│   │       ├── PaymentUI.jsx        # Payment component
│   │       └── PaymentUI.css
│   ├── context/
│   │   ├── BookingContext.jsx       # Booking state management
│   │   └── AdContext.jsx            # Ad state management
│   ├── services/
│   │   ├── mockBookingService.js    # Mock booking API
│   │   └── mockAdService.js         # Mock ad API
│   ├── data/
│   │   ├── mockDrivers.js           # Driver data and simulation
│   │   ├── mockAds.js               # Advertisement data
│   │   └── mockRoutes.js            # Route calculation
│   ├── utils/
│   │   └── helpers.js               # Utility functions
│   ├── App.jsx                      # Main app component
│   ├── App.css
│   ├── index.css                    # Global styles
│   └── main.jsx                     # Entry point
├── package.json
└── README.md
\`\`\`

## Responsive Design

The application is fully responsive and optimized for:
- **Mobile**: 375px - 767px
- **Tablet**: 768px - 1439px
- **Desktop**: 1440px and above

### Testing Responsive Design

Use browser DevTools to test different screen sizes:
1. Open DevTools (F12 or Cmd+Option+I)
2. Toggle device toolbar (Cmd+Shift+M or Ctrl+Shift+M)
3. Select different device presets or enter custom dimensions
4. Test at 375px (mobile) and 1440px (desktop)

## Accessibility Features

The application follows WCAG 2.1 AA guidelines:
- **ARIA Labels**: All interactive elements have descriptive labels
- **Keyboard Navigation**: Full keyboard support with visible focus indicators
- **Screen Reader Support**: Semantic HTML and ARIA attributes
- **Color Contrast**: Minimum 4.5:1 contrast ratio for text
- **Alt Text**: Descriptive alternatives for visual content

### Keyboard Navigation
- **Tab**: Navigate between interactive elements
- **Enter/Space**: Activate buttons and controls
- **Escape**: Close modals (when implemented)

## Mock Data

The application uses mock data to simulate a real backend:

### Predefined Locations
- **"here"**: Times Square, New York (40.7580, -73.9855)
- **"there"**: Central Park, New York (40.7829, -73.9654)

### Mock Drivers
5 drivers with various ratings and vehicles

### Mock Advertisements
3 advertisements with 10-15% discounts and 30-45 second durations

## Build for Production

\`\`\`bash
npm run build
\`\`\`

The built files will be in the \`dist/\` directory.

## Preview Production Build

\`\`\`bash
npm run preview
\`\`\`

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Known Limitations

- Map visualization is simulated (not using real mapping service)
- Location input only supports "here" and "there" keywords
- Payment processing is simulated (no real transactions)
- Video ads use sample video URLs

## Future Enhancements

- Real geocoding integration
- Interactive map with real-time tracking
- Multiple ride types (economy, premium, shared)
- Real-time messaging with driver
- Trip history and favorites
- Multiple language support

## License

This is a demonstration project for educational purposes.

## Support

For issues or questions, please refer to the project documentation or contact the development team.
