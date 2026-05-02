import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import AlertBanner from "../../components/ui/AlertBanner";
import Logo from "../../components/common/Logo";
import { useAuth } from "../../hooks/useAuth";
import { authService } from "../../services/authService";
import { ROUTES } from "../../constants/routes";

const AUTH_MODES = {
  SIGN_IN: "signin",
  SIGN_UP: "signup",
  FORGOT: "forgot",
};

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.193 36 24 36c-6.627 0-12-5.373-12-12S17.373 12 24 12c3.059 0 5.84 1.154 7.957 3.043l5.657-5.657C34.046 6.053 29.27 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.84 1.154 7.957 3.043l5.657-5.657C34.046 6.053 29.27 4 24 4c-7.682 0-14.347 4.337-17.694 10.691Z" />
      <path fill="#4CAF50" d="M24 44c5.167 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.146 35.091 26.715 36 24 36c-5.172 0-9.617-3.319-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44Z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.05 12.05 0 0 1-4.084 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z" />
    </svg>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="mb-2 block text-[0.95rem] font-medium text-slate-600">{label}</label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="mt-1.5 flex items-center gap-1.5 text-[0.78rem] text-red-500"
          >
            <AlertCircle size={12} /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function getModeFromLocation(pathname, searchMode) {
  if (pathname === ROUTES.REGISTER || searchMode === AUTH_MODES.SIGN_UP) {
    return AUTH_MODES.SIGN_UP;
  }
  if (pathname === ROUTES.FORGOT_PASSWORD || searchMode === AUTH_MODES.FORGOT) {
    return AUTH_MODES.FORGOT;
  }
  return AUTH_MODES.SIGN_IN;
}

function getErrorMessage(error) {
  const data = error?.response?.data;

  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message.trim();
  }

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const firstError = data.errors.find((item) => typeof item?.message === "string");
    if (firstError?.message) {
      return firstError.message;
    }
  }

  return error?.message || "Something went wrong. Please try again.";
}

function mapFriendlyAuthError(mode, error) {

  // Always prefer a clear message for 401 errors (wrong email or password)
  let message = getErrorMessage(error);
  const normalized = message.toLowerCase();
  // If error has HTTP status 401, always show a clear message
  if (error?.response?.status === 401) {
    // If backend message is missing or not recognized, fallback to generic
    if (
      normalized.includes("incorrect password") ||
      normalized.includes("invalid credentials") ||
      normalized.includes("no account found")
    ) {
      // Use mapped messages below
    } else {
      return "Incorrect email or password. Please try again or reset it.";
    }
  }

  if (mode === AUTH_MODES.SIGN_IN) {
    if (normalized.includes("no account found")) return "No account found with that email. You can create one here.";
    if (normalized.includes("incorrect password")) return "Incorrect password. Please try again or reset it.";
    if (normalized.includes("invalid credentials")) return "Email or password is incorrect. Please try again.";
    if (normalized.includes("too many")) return "Too many attempts. Please wait a moment and try again.";
  }

  if (mode === AUTH_MODES.SIGN_UP) {
    if (normalized.includes("already registered") || normalized.includes("already exists") || normalized.includes("already taken")) {
      return "An account with this email already exists. Try signing in instead.";
    }
    if (normalized.includes("password must be at least 6")) {
      return "Password must be at least 6 characters.";
    }
  }

  if (mode === AUTH_MODES.FORGOT) {
    if (normalized.includes("invalid email")) return "Please enter a valid email address.";
    if (normalized.includes("failed to send") || normalized.includes("email")) {
      return "We couldn't send the reset email right now. Please try again in a moment.";
    }
  }

  return message;
}

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryEmail = searchParams.get("email") || "";
  const authMode = getModeFromLocation(location.pathname, searchParams.get("mode"));

  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showSignUpPass, setShowSignUpPass] = useState(false);
  const [serverErr, setServerErr] = useState(null);
  const [forgotNotice, setForgotNotice] = useState("");
  const {
    login,
    register: registerUser,
    forgotPassword,
    completeExternalLogin,
    isLoggingIn,
    isRegistering,
    isSendingReset,
  } = useAuth();
  const handledGoogleTokenRef = useRef("");

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: queryEmail, password: "" },
  });

  const signUpForm = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: queryEmail, password: "" },
  });

  const forgotForm = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: queryEmail },
  });

  useEffect(() => {
    if (!queryEmail) return;
    loginForm.setValue("email", queryEmail);
    signUpForm.setValue("email", queryEmail);
    forgotForm.setValue("email", queryEmail);
  }, [forgotForm, loginForm, queryEmail, signUpForm]);

  useEffect(() => {
    const provider = searchParams.get("provider");
    const googleToken = searchParams.get("accessToken");
    const googleError = searchParams.get("error");

    if (provider !== "google") return;

    if (googleError) {
      setServerErr(googleError);
      return;
    }

    if (!googleToken || handledGoogleTokenRef.current === googleToken) return;
    handledGoogleTokenRef.current = googleToken;

    completeExternalLogin(googleToken).catch((error) => {
      handledGoogleTokenRef.current = "";
      setServerErr(mapFriendlyAuthError(AUTH_MODES.SIGN_IN, error));
    });
  }, [completeExternalLogin, searchParams]);

  const getKnownEmail = () =>
    signUpForm.getValues("email") || loginForm.getValues("email") || forgotForm.getValues("email") || queryEmail;

  const switchMode = (nextMode) => {
    setServerErr(null);
    if (nextMode !== AUTH_MODES.FORGOT) {
      setForgotNotice("");
    }

    const params = new URLSearchParams();
    if (nextMode !== AUTH_MODES.SIGN_IN) {
      params.set("mode", nextMode);
    }

    const nextEmail = getKnownEmail();
    if (nextEmail) {
      params.set("email", nextEmail);
    }

    navigate(`${ROUTES.LOGIN}${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const onLoginSubmit = async (data) => {
    setServerErr(null);
    try {
      await login(data);
    } catch (error) {
      setServerErr(mapFriendlyAuthError(AUTH_MODES.SIGN_IN, error));
    }
  };

  const onSignUpSubmit = async (data) => {
    setServerErr(null);
    try {
      await registerUser(data);
    } catch (error) {
      setServerErr(mapFriendlyAuthError(AUTH_MODES.SIGN_UP, error));
    }
  };

  const onForgotSubmit = async (data) => {
    setServerErr(null);
    try {
      await forgotPassword(data);
      setForgotNotice(`If an account exists for ${data.email}, a reset link is on its way.`);
    } catch (error) {
      setServerErr(mapFriendlyAuthError(AUTH_MODES.FORGOT, error));
    }
  };

  const handleGoogleClick = () => {
    setServerErr(null);
    window.location.href = authService.getGoogleAuthUrl();
  };

  const currentTitle = {
    [AUTH_MODES.SIGN_IN]: "Welcome back",
    [AUTH_MODES.SIGN_UP]: "Welcome back",
    [AUTH_MODES.FORGOT]: "Welcome back",
  }[authMode];

  const currentSubtitle = {
    [AUTH_MODES.SIGN_IN]: "",
    [AUTH_MODES.SIGN_UP]: "Create your account without leaving this page.",
    [AUTH_MODES.FORGOT]: "Reset your password from the same screen.",
  }[authMode];

  return (
    <div className="min-h-screen px-3 py-3 md:px-5" style={{ background: "#f7f5f1" }}>
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1660px] gap-3 rounded-[28px] border border-black/8 bg-[#fcfbf8] p-3 shadow-[0_10px_40px_rgba(15,23,42,0.06)] lg:grid-cols-[1.08fr_0.92fr]">
        <div className="flex rounded-[24px] border border-black/8 bg-[#fcfbf8] px-6 py-7 md:px-9 lg:px-12">
          <div className="mx-auto flex w-full max-w-[510px] flex-col justify-center">
            <div className="mb-5 flex flex-col items-center text-center">
              <Logo size="md" dark className="pointer-events-none select-none text-[1.6rem]" />
              <h1 className="mt-7 text-[1.75rem] leading-none tracking-[-0.04em] text-[#0b0914] md:text-[2rem]" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                {currentTitle}
              </h1>
              {currentSubtitle ? (
                <p className="mt-3 max-w-[24rem] text-[0.94rem] text-slate-500">{currentSubtitle}</p>
              ) : null}
            </div>

            <AnimatePresence>
              {serverErr && (
                <div className="mx-auto mb-5 w-full max-w-[500px]">
                  <AlertBanner
                    variant="error"
                    title="Something went wrong"
                    message={serverErr}
                    onClose={() => setServerErr(null)}
                  />
                </div>
              )}
            </AnimatePresence>

            {authMode === AUTH_MODES.FORGOT && forgotNotice ? (
              <div className="mx-auto w-full max-w-[500px] rounded-[24px] border border-[#dce9da] bg-[#f3fbf3] p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#dff4e0] text-[#1f8a45]">
                  <MailCheck size={26} />
                </div>
                <h2 className="mt-4 text-[1.15rem] font-semibold text-[#10251a]">Check your email</h2>
                <p className="mt-2 text-[0.96rem] leading-6 text-[#476152]">{forgotNotice}</p>
                <button
                  type="button"
                  onClick={() => switchMode(AUTH_MODES.SIGN_IN)}
                  className="mt-5 inline-flex items-center justify-center rounded-2xl border-none bg-[#04030d] px-5 py-3 text-[0.98rem] font-semibold text-white transition hover:bg-[#0c0b18]"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                {authMode !== AUTH_MODES.FORGOT && (
                  <>
                    <button
                      type="button"
                      onClick={handleGoogleClick}
                      className="mx-auto flex w-full max-w-[452px] items-center justify-center gap-3 rounded-2xl border border-[#d6d5dc] bg-[#d9d9de] px-4 py-3 text-[0.96rem] font-medium text-[#111019] transition hover:bg-[#d1d1d8]"
                    >
                      <GoogleIcon />
                      {authMode === AUTH_MODES.SIGN_UP ? "Sign up with Google" : "Continue with Google"}
                    </button>

                    <div className="mx-auto my-6 flex w-full max-w-[452px] items-center gap-4">
                      <div className="h-px flex-1 bg-[#e5e1d9]" />
                      <span className="text-sm text-slate-500">{authMode === AUTH_MODES.SIGN_UP ? "Or create an account with email" : "Or sign in with email"}</span>
                      <div className="h-px flex-1 bg-[#e5e1d9]" />
                    </div>
                  </>
                )}

                {authMode === AUTH_MODES.SIGN_IN && (
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="mx-auto flex w-full max-w-[452px] flex-col gap-4.5">
                    <Field label="Email" error={loginForm.formState.errors.email?.message}>
                      <input
                        {...loginForm.register("email")}
                        type="email"
                        placeholder="you@example.com"
                        className="w-full rounded-2xl border bg-[#dfe9fb] px-4 py-3 text-[0.98rem] text-[#0b0914] outline-none transition placeholder:text-slate-500"
                        style={{ borderColor: loginForm.formState.errors.email ? "rgba(239,68,68,0.7)" : "#c6cfdf" }}
                      />
                    </Field>

                    <Field label="Password" error={loginForm.formState.errors.password?.message}>
                      <div className="relative">
                        <input
                          {...loginForm.register("password")}
                          type={showLoginPass ? "text" : "password"}
                          placeholder="Your password"
                          className="w-full rounded-2xl border bg-[#dfe9fb] px-4 py-3 pr-14 text-[0.98rem] text-[#0b0914] outline-none transition placeholder:text-slate-500"
                          style={{ borderColor: loginForm.formState.errors.password ? "rgba(239,68,68,0.7)" : "#c6cfdf" }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPass((prev) => !prev)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 border-none bg-transparent text-slate-600 transition hover:text-slate-900"
                        >
                          {showLoginPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </Field>

                    <button
                      type="button"
                      onClick={() => switchMode(AUTH_MODES.FORGOT)}
                      className="mt-1 text-center text-[0.98rem] text-slate-500 no-underline underline-offset-4 hover:text-slate-700 hover:underline"
                    >
                      Forgot your password?
                    </button>

                    <motion.button
                      type="submit"
                      disabled={isLoggingIn}
                      whileTap={{ scale: 0.985 }}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-none bg-[#04030d] px-4 py-3.25 text-[1rem] font-semibold text-white transition hover:bg-[#0c0b18] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoggingIn ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> Signing in...
                        </>
                      ) : (
                        "Sign in"
                      )}
                    </motion.button>

                    <p className="mt-4 text-center text-[0.98rem] text-slate-500">
                      Don&apos;t have an account yet?{" "}
                      <button
                        type="button"
                        onClick={() => switchMode(AUTH_MODES.SIGN_UP)}
                        className="border-none bg-transparent p-0 text-slate-600 underline underline-offset-4 hover:text-slate-900"
                      >
                        Sign up
                      </button>
                    </p>
                  </form>
                )}

                {authMode === AUTH_MODES.SIGN_UP && (
                  <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)} className="mx-auto flex w-full max-w-[452px] flex-col gap-4.5">
                    <Field label="Full name" error={signUpForm.formState.errors.name?.message}>
                      <input
                        {...signUpForm.register("name")}
                        type="text"
                        placeholder="John Doe"
                        className="w-full rounded-2xl border bg-[#dfe9fb] px-4 py-3 text-[0.98rem] text-[#0b0914] outline-none transition placeholder:text-slate-500"
                        style={{ borderColor: signUpForm.formState.errors.name ? "rgba(239,68,68,0.7)" : "#c6cfdf" }}
                      />
                    </Field>

                    <Field label="Email" error={signUpForm.formState.errors.email?.message}>
                      <input
                        {...signUpForm.register("email")}
                        type="email"
                        placeholder="you@example.com"
                        className="w-full rounded-2xl border bg-[#dfe9fb] px-4 py-3 text-[0.98rem] text-[#0b0914] outline-none transition placeholder:text-slate-500"
                        style={{ borderColor: signUpForm.formState.errors.email ? "rgba(239,68,68,0.7)" : "#c6cfdf" }}
                      />
                    </Field>

                    <Field label="Password" error={signUpForm.formState.errors.password?.message}>
                      <div className="relative">
                        <input
                          {...signUpForm.register("password")}
                          type={showSignUpPass ? "text" : "password"}
                          placeholder="Minimum 6 characters"
                          className="w-full rounded-2xl border bg-[#dfe9fb] px-4 py-3 pr-14 text-[0.98rem] text-[#0b0914] outline-none transition placeholder:text-slate-500"
                          style={{ borderColor: signUpForm.formState.errors.password ? "rgba(239,68,68,0.7)" : "#c6cfdf" }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignUpPass((prev) => !prev)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 border-none bg-transparent text-slate-600 transition hover:text-slate-900"
                        >
                          {showSignUpPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </Field>

                    <motion.button
                      type="submit"
                      disabled={isRegistering}
                      whileTap={{ scale: 0.985 }}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-none bg-[#04030d] px-4 py-3.25 text-[1rem] font-semibold text-white transition hover:bg-[#0c0b18] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isRegistering ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> Creating account...
                        </>
                      ) : (
                        "Create account"
                      )}
                    </motion.button>

                    <p className="mt-4 text-center text-[0.98rem] text-slate-500">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => switchMode(AUTH_MODES.SIGN_IN)}
                        className="border-none bg-transparent p-0 text-slate-600 underline underline-offset-4 hover:text-slate-900"
                      >
                        Sign in
                      </button>
                    </p>
                  </form>
                )}

                {authMode === AUTH_MODES.FORGOT && (
                  <form onSubmit={forgotForm.handleSubmit(onForgotSubmit)} className="mx-auto flex w-full max-w-[452px] flex-col gap-4.5">
                    <Field label="Email" error={forgotForm.formState.errors.email?.message}>
                      <input
                        {...forgotForm.register("email")}
                        type="email"
                        placeholder="you@example.com"
                        className="w-full rounded-2xl border bg-[#dfe9fb] px-4 py-3 text-[0.98rem] text-[#0b0914] outline-none transition placeholder:text-slate-500"
                        style={{ borderColor: forgotForm.formState.errors.email ? "rgba(239,68,68,0.7)" : "#c6cfdf" }}
                      />
                    </Field>

                    <motion.button
                      type="submit"
                      disabled={isSendingReset}
                      whileTap={{ scale: 0.985 }}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-none bg-[#04030d] px-4 py-3.25 text-[1rem] font-semibold text-white transition hover:bg-[#0c0b18] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSendingReset ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> Sending reset link...
                        </>
                      ) : (
                        "Send reset link"
                      )}
                    </motion.button>

                    <p className="mt-4 text-center text-[0.98rem] text-slate-500">
                      Remembered it?{" "}
                      <button
                        type="button"
                        onClick={() => switchMode(AUTH_MODES.SIGN_IN)}
                        className="border-none bg-transparent p-0 text-slate-600 underline underline-offset-4 hover:text-slate-900"
                      >
                        Back to sign in
                      </button>
                    </p>
                  </form>
                )}
              </>
            )}

          </div>
        </div>

        <div className="relative hidden overflow-hidden rounded-[24px] bg-[#09111d] p-7 lg:flex lg:min-h-[740px]">
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 18% 88%, rgba(139,194,255,0.42), transparent 24%), radial-gradient(circle at 62% 102%, rgba(159,213,255,0.32), transparent 20%), linear-gradient(180deg, #0a111c 0%, #0d1725 68%, #7ea4c0 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(2px 2px at 24px 38px, rgba(255,255,255,0.92), transparent), radial-gradient(1px 1px at 92px 142px, rgba(255,255,255,0.68), transparent), radial-gradient(1.5px 1.5px at 166px 86px, rgba(255,255,255,0.78), transparent), radial-gradient(1px 1px at 248px 198px, rgba(255,255,255,0.62), transparent), radial-gradient(2px 2px at 328px 118px, rgba(255,255,255,0.82), transparent), radial-gradient(1px 1px at 418px 72px, rgba(255,255,255,0.58), transparent), radial-gradient(1.5px 1.5px at 512px 158px, rgba(255,255,255,0.8), transparent), radial-gradient(1px 1px at 610px 104px, rgba(255,255,255,0.64), transparent), radial-gradient(2px 2px at 704px 214px, rgba(255,255,255,0.78), transparent), radial-gradient(1px 1px at 774px 56px, rgba(255,255,255,0.7), transparent), radial-gradient(1px 1px at 128px 286px, rgba(255,255,255,0.62), transparent), radial-gradient(1.5px 1.5px at 232px 338px, rgba(255,255,255,0.7), transparent), radial-gradient(1px 1px at 388px 266px, rgba(255,255,255,0.58), transparent), radial-gradient(2px 2px at 476px 346px, rgba(255,255,255,0.76), transparent), radial-gradient(1px 1px at 586px 432px, rgba(255,255,255,0.66), transparent), radial-gradient(1.5px 1.5px at 706px 410px, rgba(255,255,255,0.76), transparent), radial-gradient(1px 1px at 164px 540px, rgba(255,255,255,0.72), transparent), radial-gradient(2px 2px at 748px 564px, rgba(255,255,255,0.8), transparent)",
              opacity: 0.92,
            }}
          />
          <div style={{ position: "absolute", top: 165, left: "49.5%", width: 108, height: 1.5, background: "linear-gradient(90deg, rgba(255,255,255,0.9), rgba(255,255,255,0.08))", transform: "rotate(28deg)", transformOrigin: "left center", boxShadow: "0 0 12px rgba(255,255,255,0.38)" }} />

          <div className="relative z-10 flex w-full flex-col items-center justify-center text-center text-white">
            <h2 className="max-w-[405px] text-[2.1rem] leading-[1.16] tracking-[-0.042em] xl:text-[2.3rem]" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
              Track spend, ask anything.
              <br />
              Own your wealth.
            </h2>

            <div className="mt-10 text-center">
              <div className="text-[0.68rem] tracking-[0.36em]">★★★★★</div>
              <div className="mt-2 text-[0.66rem] font-semibold tracking-[0.25em] text-white/90">100K+ MEMBERS</div>
            </div>

            <div className="mt-10 w-[392px] rounded-[24px] border border-white/20 bg-[linear-gradient(180deg,rgba(39,56,73,0.9),rgba(76,100,122,0.86))] p-5 text-left shadow-[0_22px_60px_rgba(0,0,0,0.28)] backdrop-blur-md">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[0.7rem] uppercase tracking-[0.18em] text-white/44">Spending this month</div>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 text-[0.95rem] text-white/90">✦</div>
              </div>

              <div className="mt-8 text-[2.05rem] font-medium tracking-[-0.04em]">$2,132</div>
              <div className="mt-1 text-[0.88rem] text-white/88">• May</div>

              <div className="relative mt-7 h-[132px] overflow-hidden rounded-[18px]">
                <div
                  style={{
                    position: "absolute",
                    inset: "28px 0 16px 0",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.38), rgba(255,255,255,0.09))",
                    clipPath:
                      "path('M0,102 C48,103 92,102 132,92 C171,82 204,56 246,34 C285,15 340,9 402,10 L402,148 L0,148 Z')",
                    borderTop: "2px solid rgba(255,255,255,0.95)",
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-7 text-[0.72rem] text-white/65">
                  {["01", "07", "14", "21", "28"].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
