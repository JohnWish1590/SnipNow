(() => {
  const paddleClientToken = "live_d9d78d877713bcf65ed05aad20f";
  const lifetimePriceId = "pri_01m1s10f51v9c9dd5mnhmvz0w1";
  const buttons = document.querySelectorAll("[data-buy-button]");
  const status = document.querySelector("[data-checkout-status]");

  const setStatus = (message) => {
    if (status) status.textContent = message;
  };

  const openCheckout = () => {
    if (!window.Paddle) {
      setStatus("Checkout is still loading — please try again in a moment.");
      return;
    }

    try {
      window.Paddle.Checkout.open({
        items: [{ priceId: lifetimePriceId, quantity: 1 }],
        settings: { displayMode: "overlay", theme: "light", locale: "en" },
      });
    } catch (_error) {
      setStatus("Checkout could not be opened. Please refresh and try again.");
    }
  };

  if (window.Paddle) {
    window.Paddle.Initialize({ token: paddleClientToken });
  }

  buttons.forEach((button) => button.addEventListener("click", openCheckout));
})();
