"use client";

import { Video } from "lucide-react";

export default function VideosPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <Video className="h-16 w-16 mb-4 text-muted-foreground" />
      <h1 className="text-3xl font-bold">Coming Soon!</h1>
      <p className="mt-2 text-muted-foreground">
        The video watching feature is currently under development.
      </p>
    </div>
  );
}