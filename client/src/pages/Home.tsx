import React from "react";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import "../assets/minecraft-styles.css";

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="text-center mb-12">
        <h1 className="minecraft-title mb-4 text-4xl">
          Chào mừng đến với nơi xàm lul cùng các đồng râm Roguecraft!
        </h1>
        <p className="minecraft-text text-lg max-w-2xl mx-auto">
          This forum created by Miu2k3
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="minecraft-card hover:translate-y-[-2px] transition-transform">
          <div className="pb-4">
            <h2 className="minecraft-title text-2xl">Diễn đàn</h2>
            <p className="minecraft-text mt-2 pb-4">
              Tham gia thảo luận, đặt câu hỏi và chia sẻ kiến thức với cộng đồng
            </p>
          </div>
          <div className="pt-0">
            <div className="h-64 rounded-none bg-black/50 flex items-center justify-center">
              <img
                src="./src/assets/images/anh4.png"
                alt="Forum Icon"
                // className="w-24 h-24"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
          </div>
          <div className="mt-4">
            <Button asChild variant="minecraft" className="w-full" size="lg">
              <Link href="/forum">Truy cập diễn đàn</Link>
            </Button>
          </div>
        </div>

        <div className="minecraft-card hover:translate-y-[-2px] transition-transform">
          <div className="pb-4">
            <h2 className="minecraft-title text-2xl">Nơi xàm lul</h2>
            <p className="minecraft-text mt-2 pb-4">
              Cùng xàm lul với các đồng râm trong phòng chat
            </p>
          </div>
          <div className="pt-0">
            <div className="h-64 rounded-none bg-black/50 flex items-center justify-center">
              <img
                src="./src/assets/images/anh3.png"
                alt="Chat Icon"
                // className="w-24 h-24"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
          </div>
          <div className="mt-4">
            <Button asChild variant="minecraft" className="w-full" size="lg">
              <Link href="/chat">Vào phòng chat</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Notification prompt */}
      <NotificationPrompt />
    </div>
  );
}
