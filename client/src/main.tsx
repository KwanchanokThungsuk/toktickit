import React from "react";
import ReactDOM from "react-dom/client";
// import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/theme.css";
import "./styles/badges.css";
import "./styles/app-shell.css";
import "./styles/forms.css";
import "./styles/states.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
