import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2 } from "lucide-react";

const DEFAULT_LOGO = "/image/company-logo.png";

type BrandHeaderProps = {
  size?: "sm" | "md" | "lg";
  variant?: "vertical" | "horizontal";
  className?: string;
};

const logoSizes = { sm: 36, md: 56, lg: 120 };
const gapSizes = { sm: "gap-0.5", md: "gap-1", lg: "gap-1.5" };
const headingSizes = { sm: "text-xs", md: "text-base", lg: "text-2xl" };
const subSizes = { sm: "text-[9px]", md: "text-[11px]", lg: "text-sm" };
const marginTop = { sm: "mt-1", md: "mt-2", lg: "mt-3" };
const iconSizes = { sm: 16, md: 24, lg: 40 };

function LogoImage({ src, alt, size, className }: { src: string; alt: string; size: "sm" | "md" | "lg"; className?: string }) {
  const [failed, setFailed] = useState(false);
  const px = logoSizes[size];

  if (failed) {
    return <Building2 className="text-muted-foreground/40" style={{ width: iconSizes[size], height: iconSizes[size] }} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        console.error(`[BrandHeader] Failed to load logo: ${src}`);
        setFailed(true);
      }}
    />
  );
}

export function BrandHeader({ size = "md", variant = "vertical", className = "" }: BrandHeaderProps) {
  const { data: appLogo } = useQuery({
    queryKey: ["app-logo"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "app_logo").maybeSingle();
      const v = (data?.value ?? {}) as { url?: string };
      return v.url || null;
    },
  });

  const logoUrl = appLogo || DEFAULT_LOGO;
  const logoPx = logoSizes[size];

  if (variant === "horizontal") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1 shadow" style={{ width: logoPx + 8, height: logoPx + 8 }}>
          <LogoImage src={logoUrl} alt="Company Logo" size={size} className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`truncate font-bold leading-tight ${headingSizes[size]}`}>SMT Family</div>
          <div className={`truncate leading-tight text-primary ${subSizes[size]}`} lang="bn">একতাবদ্ধ পরিবার,সেরা মানের সেরা উপহার</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        className="grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-2 shadow-lg"
        style={{ width: logoPx + 16, height: logoPx + 16 }}
      >
        <LogoImage src={logoUrl} alt="Company Logo" size={size} className="h-full w-full object-contain" />
      </div>
      <div className={`flex flex-col items-center ${gapSizes[size]} ${marginTop[size]}`}>
        <div className={`font-bold leading-tight ${headingSizes[size]}`}>SMT Family</div>
        <div className={`leading-tight text-primary ${subSizes[size]}`} lang="bn">একতাবদ্ধ পরিবার,সেরা মানের সেরা উপহার</div>
      </div>
    </div>
  );
}