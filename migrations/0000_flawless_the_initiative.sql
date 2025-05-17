CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`content` varchar(1000) NOT NULL,
	`media` json,
	`created_at` timestamp DEFAULT (now()),
	`mentions` json,
	`reply_to_message_id` int,
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`topic_id` int,
	`user_id` int,
	`content` varchar(1000) NOT NULL,
	`media` json,
	`created_at` timestamp DEFAULT (now()),
	`is_anonymous` boolean DEFAULT false,
	`parent_comment_id` int,
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `topic_likes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`topic_id` int,
	`user_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `topic_likes_id` PRIMARY KEY(`id`),
	CONSTRAINT `topic_likes_user_id_topic_id_unique` UNIQUE(`user_id`,`topic_id`)
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`title` varchar(255) NOT NULL,
	`content` varchar(10000) NOT NULL,
	`media` json,
	`category` varchar(50) NOT NULL,
	`is_anonymous` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	`view_count` int DEFAULT 0,
	`like_count` int DEFAULT 0,
	`comment_count` int DEFAULT 0,
	CONSTRAINT `topics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(255) NOT NULL,
	`password` varchar(255),
	`avatar` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	`last_active` timestamp DEFAULT (now()),
	`is_temporary` boolean DEFAULT true,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_topic_id_topics_id_fk` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `topic_likes` ADD CONSTRAINT `topic_likes_topic_id_topics_id_fk` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `topic_likes` ADD CONSTRAINT `topic_likes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `topics` ADD CONSTRAINT `topics_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;