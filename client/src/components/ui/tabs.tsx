import React from "react";

export const Tabs = ({
  children,
}: {
  children: React.ReactNode;
}) => <div>{children}</div>;

export const TabsList = ({
  children,
  className = "",
}: any) => <div className={className}>{children}</div>;

export const TabsTrigger = ({
  children,
  className = "",
}: any) => <button className={className}>{children}</button>;

export const TabsContent = ({
  children,
}: {
  children: React.ReactNode;
}) => <div>{children}</div>;