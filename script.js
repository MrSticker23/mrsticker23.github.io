document.addEventListener("DOMContentLoaded", () => {
  const validPasswords = ["password1", "password2", "password3"]; // Add your passwords here
  const passwordInput = document.getElementById("password-input");
  const submitButton = document.getElementById("submit-button");
  const errorMessage = document.getElementById("error-message");
  const loadingScreen = document.getElementById("loading-screen");
  const mainContent = document.getElementById("main-content");
  const passwordContainer = document.getElementById("password-container");

  submitButton.addEventListener("click", () => {
    const enteredPassword = passwordInput.value.trim();

    if (validPasswords.includes(enteredPassword)) {
      errorMessage.style.display = "none";
      passwordContainer.style.display = "none";
      loadingScreen.style.display = "flex"; // Show loading screen

      setTimeout(() => {
        loadingScreen.style.display = "none"; // Hide loading screen
        mainContent.style.display = "flex";  // Show main content
      }, 3000);
    } else {
      errorMessage.style.display = "block";
      passwordInput.value = "";
    }
  });
});
