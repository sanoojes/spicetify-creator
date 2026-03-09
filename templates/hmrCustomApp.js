const React = Spicetify.React;
const rc = React.createElement;

const waitForImport = async (retryCount = 0) => {
  try {
    const mod = await import(_IMPORT_LINK);
    return mod.default || mod.render;
  } catch (err) {
    console.error("Failed to import app:", err);
    if (retryCount < 3) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return waitForImport(retryCount + 1);
    }
    return null;
  }
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    width: "100%",
    background:
      "radial-gradient(circle at top left, rgba(29, 185, 84, 0.15), transparent 50%), var(--spice-main, #121212)",
    color: "var(--spice-text, #ffffff)",
    fontFamily: "var(--font-family, Circular, Helvetica, Arial, sans-serif)",
  },
  loadingText: {
    marginTop: "24px",
    fontSize: "14px",
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "48px",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    backdropFilter: "blur(16px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "24px",
    boxShadow: "0 16px 40px rgba(0, 0, 0, 0.4)",
    maxWidth: "800px",
    width: "90%",
    textAlign: "center",
  },
  iconContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    backgroundColor: "rgba(241, 94, 108, 0.1)",
    border: "1px solid rgba(241, 94, 108, 0.2)",
    marginBottom: "24px",
    boxShadow: "0 0 20px rgba(241, 94, 108, 0.15)",
  },
  errorTitle: {
    fontSize: "28px",
    fontWeight: "800",
    marginBottom: "16px",
    color: "#ffffff",
    letterSpacing: "-0.04em",
  },
  errorTraceBox: {
    width: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    boxShadow: "inset 0 4px 10px rgba(0,0,0,0.3)",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "32px",
    textAlign: "left",
    overflowX: "auto",
  },
  errorMessage: {
    fontSize: "13px",
    lineHeight: "1.6",
    fontFamily: "monospace",
    color: "rgba(255, 255, 255, 0.7)",
    wordBreak: "break-word",
    margin: 0,
  },
  buttonBase: {
    padding: "14px 36px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#ffffff",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "500px",
    cursor: "pointer",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    transition: "all 0.2s ease",
  },
};

const AlertIcon = () =>
  rc(
    "svg",
    {
      width: "32",
      height: "32",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "rgba(241, 94, 108, 0.9)",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
    },
    rc("path", {
      d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
    }),
    rc("line", { x1: "12", y1: "9", x2: "12", y2: "13" }),
    rc("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" }),
  );

const Spinner = () =>
  rc(
    "svg",
    { width: "48", height: "48", viewBox: "0 0 50 50" },
    rc("circle", {
      cx: "25",
      cy: "25",
      r: "20",
      fill: "none",
      stroke: "rgba(255,255,255,0.1)",
      strokeWidth: "4",
    }),
    rc(
      "circle",
      {
        cx: "25",
        cy: "25",
        r: "20",
        fill: "none",
        stroke: "rgba(255,255,255,0.8)",
        strokeWidth: "4",
        strokeDasharray: "30 100",
        strokeLinecap: "round",
      },
      rc("animateTransform", {
        attributeName: "transform",
        type: "rotate",
        from: "0 25 25",
        to: "360 25 25",
        dur: "1s",
        repeatCount: "indefinite",
      }),
    ),
  );

const RetryButton = ({ onClick }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isActive, setIsActive] = React.useState(false);

  const dynamicStyle = {
    ...styles.buttonBase,
    backgroundColor: isActive
      ? "rgba(255, 255, 255, 0.15)"
      : isHovered
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(255, 255, 255, 0.05)",
    borderColor: isHovered ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.1)",
    transform: isActive ? "scale(0.96)" : isHovered ? "scale(1.02)" : "scale(1)",
    boxShadow: isHovered ? "0 4px 12px rgba(0,0,0,0.2)" : "none",
  };

  return rc(
    "button",
    {
      style: dynamicStyle,
      onClick,
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => {
        setIsHovered(false);
        setIsActive(false);
      },
      onMouseDown: () => setIsActive(true),
      onMouseUp: () => setIsActive(false),
    },
    "Try Again",
  );
};

const Loading = () =>
  rc(
    "div",
    { style: styles.container },
    rc(Spinner),
    rc("div", { style: styles.loadingText }, "Loading app..."),
  );

const ErrorDisplay = ({ message, onRetry }) =>
  rc(
    "div",
    { style: styles.container },
    rc(
      "div",
      { style: styles.errorContainer },
      rc("div", { style: styles.iconContainer }, rc(AlertIcon)),
      rc("div", { style: styles.errorTitle }, "Failed to load app"),
      rc("div", { style: styles.errorTraceBox }, rc("p", { style: styles.errorMessage }, message)),
      rc(RetryButton, { onClick: onRetry }),
    ),
  );

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage:
        error.stack || error.message || "A runtime error occurred in the app component.",
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Caught inside ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return rc(ErrorDisplay, {
        message: this.state.errorMessage,
        onRetry: () => {
          this.setState({ hasError: false, errorMessage: null });
          if (this.props.onRetry) this.props.onRetry();
        },
      });
    }
    return this.props.children;
  }
}

const AppWrapper = () => {
  const [App, setApp] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadApp = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    waitForImport()
      .then((app) => {
        if (app) {
          setApp(() => app);
        } else {
          setError("Unable to load the app. Please check if the development server is running.");
        }
      })
      .catch((err) => {
        setError(err.stack || err.message || "An unexpected error occurred during import.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  React.useEffect(() => {
    loadApp();
  }, [loadApp]);

  if (isLoading) return rc(Loading);
  if (error) return rc(ErrorDisplay, { message: error, onRetry: loadApp });
  if (!App) return rc(ErrorDisplay, { message: "App component not found.", onRetry: loadApp });

  return rc(ErrorBoundary, { onRetry: loadApp }, rc(App));
};
var render = () => rc(AppWrapper);
