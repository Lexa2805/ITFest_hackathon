import { Redirect } from "expo-router";

/** Default route for the (auth) group → login screen */
export default function AuthIndex() {
  return <Redirect href="/(auth)/login" />;
}
