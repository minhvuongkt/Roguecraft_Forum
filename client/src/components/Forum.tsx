import React, { useState } from "react";
import { useLocation } from "wouter";
import { Topic } from "@/components/Topic";
import { CreateTopicModal } from "@/components/CreateTopicModal";
import { Button } from "@/components/ui/button";
import { useForum } from "@/hooks/useForum";
import { useAuth } from "@/contexts/AuthContext";
import { PlusIcon } from "lucide-react";
import { LoginModal } from "@/components/LoginModal";

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
    { id: "survival", name: "Survival" },
    { id: "creative", name: "Creative" },
    { id: "mods", name: "Mods" },
    { id: "redstone", name: "Redstone" },
    { id: "pvp", name: "PvP" },
    { id: "servers", name: "Servers" },
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
        {/* <h1 className="text-2xl font-bold">Forum Minecraft</h1> */}
        <Button
          onClick={handleCreateTopicClick}
          className="bg-primary hover:bg-primary/90 text-white"
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          Tạo Topic Mới
        </Button>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.name ? "default" : "outline"}
            size="sm"
            className={`rounded-full ${
              selectedCategory === category.name
                ? "bg-primary hover:bg-primary/90 text-white"
                : "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700"
            }`}
            onClick={() => setSelectedCategory(category.name)}
          >
            {category.name}
          </Button>
        ))}
      </div>

      {/* Topics */}
      <div className="space-y-4">
        {isTopicsLoading ? (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-2 text-sm text-muted-foreground">
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
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Không có bài viết nào trong danh mục này
            </p>
          </div>
        )}

        {topics.length > 0 && (
          <div className="flex justify-between items-center mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (page > 1) {
                  setPage(page - 1);
                  window.scrollTo(0, 0);
                }
              }}
              disabled={page <= 1 || isTopicsLoading}
            >
              Trang trước
            </Button>

            <span className="text-sm text-muted-foreground">Trang {page}</span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (topics.length === 10) {
                  // If we have 10 topics, there might be more
                  setPage(page + 1);
                  window.scrollTo(0, 0);
                }
              }}
              disabled={topics.length < 10 || isTopicsLoading}
            >
              Trang sau
            </Button>
          </div>
        )}
      </div>

      <CreateTopicModal
        isOpen={isCreateTopicModalOpen}
        onClose={() => setIsCreateTopicModalOpen(false)}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
