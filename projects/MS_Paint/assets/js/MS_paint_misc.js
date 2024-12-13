const slider = document.getElementById('pointer-slider');
const tooltip = document.getElementById('slider-title');

// Function to update tooltip position and text
const updateTooltip = (event) => {
    const sliderValue = slider.value;
    tooltip.textContent = `${sliderValue}px`;
    tooltip.style.left = `${event.pageX}px`;
    tooltip.style.top = `${event.pageY - 10}px`; // Slightly above the cursor
};

// Show tooltip on interaction
const showTooltip = () => {
    tooltip.style.opacity = 1;
};

// Hide tooltip when interaction stops
const hideTooltip = () => {
    tooltip.style.opacity = 0;
};

// Add event listeners
slider.addEventListener('mousedown', showTooltip);
slider.addEventListener('mousemove', updateTooltip);
slider.addEventListener('mouseup', hideTooltip);
slider.addEventListener('touchstart', showTooltip);
slider.addEventListener('touchmove', (event) => {
    // For touch devices, use the first touch point
    const touch = event.touches[0];
    updateTooltip(touch);
});
slider.addEventListener('touchend', hideTooltip);