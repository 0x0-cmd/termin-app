import { AuthForm } from "../auth-form";
import { signup } from "../auth-actions";

export const metadata = { title: "Registrieren" };

export default function SignupPage() {
  return <AuthForm action={signup} mode="signup" />;
}
