import { AuthForm } from "../auth-form";
import { login } from "../auth-actions";

export const metadata = { title: "Anmelden" };

export default function LoginPage() {
  return <AuthForm action={login} mode="login" />;
}
