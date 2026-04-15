"use client";

import { usePathname, useRouter } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ProjectTabBarItem = {
  href: string;
  label: string;
};

type ProjectTabBarProps = {
  items: ProjectTabBarItem[];
};

export function ProjectTabBar({ items }: ProjectTabBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const fallbackValue = items[0]?.href ?? "";
  const matchedItem = items.find((item) => item.href.split("#")[0] === pathname);
  const value = matchedItem?.href ?? fallbackValue;

  if (items.length === 0) {
    return null;
  }

  return (
    <Tabs className="w-full" onValueChange={(nextValue) => router.push(nextValue)} value={value}>
      <TabsList
        className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl p-1"
        variant="line"
      >
        {items.map((item) => (
          <TabsTrigger className="min-w-max px-3 py-2" key={item.href} value={item.href}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
