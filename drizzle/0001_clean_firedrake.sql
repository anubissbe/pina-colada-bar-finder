CREATE TABLE `favorite_bars` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`place_id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text,
	`latitude` varchar(50) NOT NULL,
	`longitude` varchar(50) NOT NULL,
	`rating` varchar(10),
	`price_level` int,
	`photo_url` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorite_bars_id` PRIMARY KEY(`id`)
);
