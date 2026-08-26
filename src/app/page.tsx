import { isGoogleAuthConfigured } from "@/lib/oauth-env";
import { hasServiceRoleEnv } from "@/lib/supabase/service";
import HomeLogin from "@/components/HomeLogin";

export default function HomePage() {
  return (
    <HomeLogin
      googleConfigured={isGoogleAuthConfigured()}
      supabaseConfigured={hasServiceRoleEnv()}
    />
  );
}
