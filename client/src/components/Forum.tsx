import React, { useState } from "react";
import { useLocation } from "wouter";
import { Topic } from "@/components/Topic";
import { CreateTopicModal } from "@/components/CreateTopicModal";
import { Button } from "@/components/ui/button";
import { useForum } from "@/hooks/useForum";
import { useAuth } from "@/contexts/AuthContext";
import { PlusIcon } from "lucide-react";
import { LoginModal } from "@/components/LoginModal";
import "../assets/minecraft-styles.css";

export function Forum() {
  const [isCreateTopicModalOpen, setIsCreateTopicModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const {
    topics,
    isTopicsLoading,
    selectedCategory,
    setSelectedCategory,
    page,
    setPage,
    refetchTopics,
  } = useForum();
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  const categories = [
    { id: "all", name: "Tất cả" },
    // { id: "survival", name: "Survival" },
    // { id: "creative", name: "Creative" },
    // { id: "mods", name: "Mods" },
    // { id: "redstone", name: "Redstone" },
    // { id: "pvp", name: "PvP" },
    // { id: "servers", name: "Servers" },
  ];

  const handleCreateTopicClick = () => {
    if (isAuthenticated) {
      setIsCreateTopicModalOpen(true);
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleTopicClick = (topicId: number) => {
    navigate(`/forum/${topicId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="minecraft-title text-2xl">Diễn Đàn</h1>
        <Button
          onClick={handleCreateTopicClick}
          variant="minecraft"
          className="text-white"
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          <span className="font-['VT323'] text-lg">Tạo Topic Mới</span>
        </Button>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant="minecraft"
            size="sm"
            className={`${
              selectedCategory === category.name ? "border-[#ffff55]" : ""
            }`}
            onClick={() => setSelectedCategory(category.name)}
          >
            <span className="font-['VT323'] text-base">{category.name}</span>
          </Button>
        ))}
      </div>

      {/* Topics */}
      <div className="space-y-4">
        {isTopicsLoading ? (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#ffff55] border-r-transparent"></div>
            <p className="mt-2 text-sm minecraft-text">
              Đang tải bài viết...
            </p>
          </div>
        ) : topics.length > 0 ? (
          topics.map((topic) => (
            <Topic
              key={topic.id}
              topic={topic}
              onClick={() => handleTopicClick(topic.id)}
            />
          ))
        ) : (
          <div className="text-center py-8 minecraft-card">
            <p className="minecraft-text">
              Không có bài viết nào. Hãy tạo một bài viết mới để bắt đầu thảo luận!
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-center mt-6 gap-2">
        <Button
          variant="minecraft"
          size="sm"
          onClick={() => setPage(page > 1 ? page - 1 : 1)}
          disabled={page === 1}
        >
          <span className="font-['VT323'] text-base">Trang trước</span>
        </Button>
        <Button
          variant="minecraft"
          size="sm"
          onClick={() => setPage(page + 1)}
          disabled={topics.length < 10}
        >
          <span className="font-['VT323'] text-base">Trang sau</span>
        </Button>
      </div>

      {/* Modals */}
      <CreateTopicModal
        isOpen={isCreateTopicModalOpen}
        onClose={() => {
          setIsCreateTopicModalOpen(false);
          refetchTopics();
        }}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
