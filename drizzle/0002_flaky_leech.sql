CREATE TABLE `bar_verifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`place_id` varchar(255) NOT NULL,
	`user_id` int NOT NULL,
	`has_pina_colada` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bar_verifications_id` PRIMARY KEY(`id`)
);
