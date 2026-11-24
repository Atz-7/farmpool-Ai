"use client";

import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from "react";
import AudioGuideBtn from "./AudioGuideBtn";

export const Card = ({
  title,
  audioText,
  icon,
  children,
  className = "",
}: {
  title?: string;
  audioText?: string;
  icon?: string;
  children: ReactNode;
  className?: string;
}) => (
  <section className={`rural-card p-4 sm:p-5 transition hover:shadow-md ${className}`}>
    {(title || audioText || icon) && (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          {icon && <span className="text-2xl">{icon}</span>}
          {title && <h2 className="text-lg sm:text-xl font-bold text-soil-700">{title}</h2>}
        </div>
        {audioText && <AudioGuideBtn text={audioText} />}
      </div>
    )}
    {children}
  </section>
);

export const Btn = ({
  variant = "primary",
  big,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "harvest" | "earth";
  big?: boolean;
}) => {
  let styleClasses = "";
  if (variant === "primary" || variant === "harvest") {
    styleClasses = "bg-green-700 text-white hover:bg-green-800 border-2 border-green-800";
  } else if (variant === "earth") {
    styleClasses = "bg-amber-700 text-white hover:bg-amber-800 border-2 border-amber-800";
  } else if (variant === "danger") {
    styleClasses = "bg-red-600 text-white hover:bg-red-700 border-2 border-red-700";
  } else {
    styleClasses = "border-2 border-stone-300 bg-white text-stone-800 hover:bg-stone-50";
  }

  return (
    <button
      {...p}
      className={`btn-tactile inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${
        big ? "h-14 px-6 text-lg sm:text-xl" : "h-11 px-4 text-sm sm:text-base"
      } ${styleClasses} ${p.className ?? ""}`}
    />
  );
};

export const Field = ({ label, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <label className="block text-sm">
    <span className="mb-1 block font-semibold text-stone-700">{label}</span>
    <input
      {...p}
      className="h-12 w-full rounded-xl border-2 border-stone-300 px-3.5 text-base font-medium text-stone-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
    />
  </label>
);

export const Select = ({ label, children, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) => (
  <label className="block text-sm">
    <span className="mb-1 block font-semibold text-stone-700">{label}</span>
    <select
      {...p}
      className="h-12 w-full rounded-xl border-2 border-stone-300 bg-white px-3.5 text-base font-medium text-stone-900 focus:border-green-600 focus:outline-none"
    >
      {children}
    </select>
  </label>
);

export const Err = ({ msg }: { msg: string }) =>
  msg ? (
    <div role="alert" className="flex items-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 p-3.5 text-sm font-semibold text-red-800">
      <span className="text-lg">⚠️</span>
      <span>{msg}</span>
    </div>
  ) : null;

export const Loading = () => (
  <div className="flex items-center gap-3 p-5 text-stone-600">
    <div className="h-6 w-6 animate-spin rounded-full border-4 border-green-700 border-t-transparent" />
    <span className="font-semibold text-base">कृपया प्रतीक्षा करें... (Loading...)</span>
  </div>
);

export const Badge = ({ children, color }: { children: ReactNode; color?: "amber" | "green" | "red" | "blue" | string }) => {
  const tones: Record<string, string> = {
    amber: "bg-amber-100 text-amber-800",
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-800",
  };
  const tone = (color && tones[color]) || "bg-brand-100 text-brand-700";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>{children}</span>;
};
export const Demo = () => (
  <span className="inline-flex items-center rounded-lg bg-amber-100 border border-amber-300 px-2 py-0.5 text-xs font-bold text-amber-900">
    डेमो डेटा (DEMO)
  </span>
);
