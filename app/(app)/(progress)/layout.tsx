import { ProgressTabs } from "@/components/progress-tabs";

export default function ProgressLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <ProgressTabs />
      {children}
    </>
  );
}
