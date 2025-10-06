import { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { formatCurrency, formatTime } from '../../utils/helpers';
import './PaymentUI.css';

export default function PaymentUI() {
  const { booking, trip, driver, reset } = useBooking();
  const [selectedPayment, setSelectedPayment] = useState('card');
  const [tipAmount, setTipAmount] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);

  // Payment methods
  const paymentMethods = [
    { id: 'card', name: 'Credit/Debit Card', icon: '💳', details: '•••• 4242' },
    { id: 'cash', name: 'Cash', icon: '💵', details: 'Pay driver directly' },
    { id: 'apple', name: 'Apple Pay', icon: '🍎', details: 'iPhone Wallet' }
  ];

  // Tip presets
  const tipPresets = [
    { label: '10%', value: 0.1 },
    { label: '15%', value: 0.15 },
    { label: '20%', value: 0.2 },
    { label: 'Custom', value: 'custom' }
  ];

  // Handle tip selection
  const handleTipSelect = (preset) => {
    if (preset.value === 'custom') {
      setTipAmount('custom');
      setCustomTip('');
    } else {
      setTipAmount(booking.finalFare * preset.value);
      setCustomTip('');
    }
  };

  // Handle custom tip input
  const handleCustomTipChange = (e) => {
    const value = e.target.value;
    setCustomTip(value);
    const amount = parseFloat(value);
    if (!isNaN(amount) && amount >= 0) {
      setTipAmount(amount);
    }
  };

  // Handle payment
  const handleCompletePayment = () => {
    setShowReceipt(true);
  };

  // Handle new ride
  const handleNewRide = () => {
    reset();
    setShowReceipt(false);
    setTipAmount(0);
    setCustomTip('');
  };

  if (!booking || !trip || trip.state !== 'Completed') {
    return null;
  }

  const totalWithTip = booking.finalFare + (typeof tipAmount === 'number' ? tipAmount : 0);
  const tripDuration = trip.endTime && trip.pickupTime
    ? Math.round((trip.endTime - trip.pickupTime) / 60000)
    : booking.distance * 2;

  // Show receipt
  if (showReceipt) {
    return (
      <div className="payment-ui">
        <div className="receipt-header">
          <div className="receipt-icon" aria-hidden="true">✓</div>
          <h1>Trip Complete!</h1>
          <p className="text-secondary">Thank you for riding with us</p>
        </div>

        <div className="receipt-card card">
          <div className="receipt-section">
            <h3 className="receipt-title">Receipt</h3>
            <div className="receipt-date text-sm text-secondary">
              {new Date(trip.endTime).toLocaleString()}
            </div>
          </div>

          {driver && (
            <div className="receipt-section">
              <h4 className="section-label">Driver</h4>
              <div className="driver-summary">
                <div className="driver-avatar-small" aria-hidden="true">
                  {driver.name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium">{driver.name}</div>
                  <div className="text-sm text-secondary">
                    {driver.vehicle.color} {driver.vehicle.make} {driver.vehicle.model}
                  </div>
                </div>
                <div className="driver-rating-small">
                  <span aria-hidden="true">⭐</span>
                  <span>{driver.rating.toFixed(1)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="receipt-section">
            <h4 className="section-label">Trip Details</h4>
            <div className="trip-summary">
              <div className="summary-location">
                <span className="location-pin" aria-hidden="true">📍</span>
                <span>{booking.pickup.address}</span>
              </div>
              <div className="summary-divider" aria-hidden="true">→</div>
              <div className="summary-location">
                <span className="location-pin" aria-hidden="true">🎯</span>
                <span>{booking.dropoff.address}</span>
              </div>
            </div>
            <div className="trip-stats">
              <div className="stat-item">
                <span className="text-secondary">Distance</span>
                <span className="font-medium">{booking.distance.toFixed(1)} mi</span>
              </div>
              <div className="stat-item">
                <span className="text-secondary">Duration</span>
                <span className="font-medium">{formatTime(tripDuration)}</span>
              </div>
            </div>
          </div>

          <div className="receipt-section">
            <h4 className="section-label">Payment Summary</h4>
            <div className="payment-breakdown">
              <div className="breakdown-row">
                <span className="text-secondary">Base Fare</span>
                <span>{formatCurrency(booking.baseFare)}</span>
              </div>
              {booking.discount && (
                <div className="breakdown-row discount-row">
                  <span className="text-success">Discount ({booking.discount.percentage}%)</span>
                  <span className="text-success">-{formatCurrency(booking.discountAmount)}</span>
                </div>
              )}
              {tipAmount > 0 && (
                <div className="breakdown-row">
                  <span className="text-secondary">Tip</span>
                  <span>{formatCurrency(tipAmount)}</span>
                </div>
              )}
              <div className="breakdown-row total-row">
                <span className="font-bold">Total Charged</span>
                <span className="font-bold total-price">{formatCurrency(totalWithTip)}</span>
              </div>
            </div>
            <div className="payment-method-used">
              <span className="text-secondary">Paid with</span>
              <span className="font-medium">
                {paymentMethods.find(p => p.id === selectedPayment)?.name}
              </span>
            </div>
          </div>
        </div>

        <div className="receipt-actions">
          <button className="outline" aria-label="Download receipt">
            <span aria-hidden="true">📄</span>
            Download Receipt
          </button>
          <button onClick={handleNewRide} aria-label="Book another ride">
            Book Another Ride
          </button>
        </div>
      </div>
    );
  }

  // Show payment selection
  return (
    <div className="payment-ui">
      <div className="payment-header">
        <h1>Complete Payment</h1>
        <p className="text-secondary">Your trip has ended. Please complete payment.</p>
      </div>

      <div className="trip-summary-card card">
        <div className="summary-header">
          <h3>Trip Summary</h3>
        </div>
        <div className="summary-route">
          <div className="route-endpoint">
            <span className="route-icon" aria-hidden="true">📍</span>
            <span>{booking.pickup.address}</span>
          </div>
          <div className="route-arrow" aria-hidden="true">→</div>
          <div className="route-endpoint">
            <span className="route-icon" aria-hidden="true">🎯</span>
            <span>{booking.dropoff.address}</span>
          </div>
        </div>
        <div className="summary-details">
          <div className="detail-item">
            <span className="text-secondary">Distance</span>
            <span className="font-medium">{booking.distance.toFixed(1)} miles</span>
          </div>
          <div className="detail-item">
            <span className="text-secondary">Duration</span>
            <span className="font-medium">{formatTime(tripDuration)}</span>
          </div>
        </div>
      </div>

      <div className="fare-card card">
        <h3 className="mb-md">Fare Breakdown</h3>
        <div className="fare-breakdown">
          <div className="fare-row">
            <span className="text-secondary">Base Fare</span>
            <span>{formatCurrency(booking.baseFare)}</span>
          </div>
          {booking.discount && (
            <div className="fare-row discount-applied">
              <span className="text-success">Discount ({booking.discount.percentage}%)</span>
              <span className="text-success">-{formatCurrency(booking.discountAmount)}</span>
            </div>
          )}
          <div className="fare-row subtotal-row">
            <span className="font-medium">Subtotal</span>
            <span className="font-medium">{formatCurrency(booking.finalFare)}</span>
          </div>
        </div>
      </div>

      {driver && (
        <div className="tip-card card">
          <h3 className="mb-md">Add a Tip for {driver.name}</h3>
          <div className="tip-presets">
            {tipPresets.map((preset) => (
              <button
                key={preset.label}
                className={`tip-button ${
                  (preset.value === 'custom' && tipAmount === 'custom') ||
                  (preset.value !== 'custom' && tipAmount === booking.finalFare * preset.value)
                    ? 'active'
                    : ''
                }`}
                onClick={() => handleTipSelect(preset)}
                aria-label={`Tip ${preset.label}`}
                aria-pressed={
                  (preset.value === 'custom' && tipAmount === 'custom') ||
                  (preset.value !== 'custom' && tipAmount === booking.finalFare * preset.value)
                }
              >
                {preset.label}
                {preset.value !== 'custom' && (
                  <span className="tip-amount text-sm">
                    {formatCurrency(booking.finalFare * preset.value)}
                  </span>
                )}
              </button>
            ))}
          </div>
          {tipAmount === 'custom' && (
            <div className="custom-tip-input">
              <label htmlFor="custom-tip" className="sr-only">Enter custom tip amount</label>
              <input
                id="custom-tip"
                type="number"
                placeholder="Enter amount"
                value={customTip}
                onChange={handleCustomTipChange}
                min="0"
                step="0.01"
                aria-label="Custom tip amount"
              />
            </div>
          )}
        </div>
      )}

      <div className="payment-method-card card">
        <h3 className="mb-md">Payment Method</h3>
        <div className="payment-methods">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              className={`payment-method ${selectedPayment === method.id ? 'active' : ''}`}
              onClick={() => setSelectedPayment(method.id)}
              aria-label={`Pay with ${method.name}`}
              aria-pressed={selectedPayment === method.id}
            >
              <span className="payment-icon" aria-hidden="true">{method.icon}</span>
              <div className="payment-details">
                <div className="payment-name font-medium">{method.name}</div>
                <div className="payment-info text-sm text-secondary">{method.details}</div>
              </div>
              <div className="payment-radio" aria-hidden="true">
                {selectedPayment === method.id && '✓'}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="total-card card">
        <div className="total-row">
          <span className="font-bold">Total</span>
          <span className="font-bold total-amount">{formatCurrency(totalWithTip)}</span>
        </div>
      </div>

      <button
        className="large complete-payment-button"
        onClick={handleCompletePayment}
        aria-label="Complete payment"
      >
        Complete Payment
      </button>
    </div>
  );
}
