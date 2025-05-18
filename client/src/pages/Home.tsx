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

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
          Chào mừng đến với nơi xàm lul cùng các đồng râm Roguecraft!
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          This forum created by Miu2k3
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl">Diễn đàn</CardTitle>
            <CardDescription>
              Tham gia các cuộc thảo luận, đặt câu hỏi và chia sẻ kiến thức với
              cộng đồng
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-64 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-md flex items-center justify-center">
              <svg
                className="w-24 h-24 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                />
              </svg>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full" size="lg">
              <Link href="/forum">Truy cập diễn đàn</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl">
              Nơi xàm lul
            </CardTitle>
            <CardDescription>
              Cùng xàm lul với các đồng râm trong phòng chat
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-64 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-md flex items-center justify-center">
              <svg
                className="w-24 h-24 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full" size="lg" variant="outline">
              <Link href="/chat">Vào phòng chat</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Notification prompt */}
      <NotificationPrompt />
    </div>
  );
}
