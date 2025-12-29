import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "./storage";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const getCallbackURL = () => {
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/auth/google/callback`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;
  }
  return `http://localhost:5000/api/auth/google/callback`;
};

export function setupPassport() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.warn("Google OAuth credentials not configured. SSO will be disabled.");
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: getCallbackURL(),
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(null, false, { message: "No email found in Google profile" });
          }

          if (!email.endsWith("@vye.agency")) {
            return done(null, false, { message: "Only @vye.agency email addresses are allowed" });
          }

          let user = await storage.getUserByEmail(email);
          if (!user) {
            const name = profile.displayName || email.split("@")[0].split(".").map((n: string) =>
              n.charAt(0).toUpperCase() + n.slice(1)
            ).join(" ");

            user = await storage.createUser({ email, name });
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  console.log("Google OAuth configured with callback URL:", getCallbackURL());
}

export { passport };
