-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: ice_store
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `carts`
--

DROP TABLE IF EXISTS `carts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `quantity` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_product` (`user_id`,`product_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `carts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `carts_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carts`
--

LOCK TABLES `carts` WRITE;
/*!40000 ALTER TABLE `carts` DISABLE KEYS */;
INSERT INTO `carts` VALUES (12,2,1,1),(43,5,2,3),(58,1,7,1);
/*!40000 ALTER TABLE `carts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `quantity` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (1,3,1,2),(2,3,2,2),(3,3,4,3),(4,4,1,1),(5,4,4,2),(6,5,2,1),(7,6,2,1),(8,6,4,1),(9,7,2,1),(10,8,1,3),(11,8,2,1),(12,9,2,1),(13,10,1,1),(14,11,2,1),(15,12,2,10),(16,13,1,2),(17,13,2,1),(18,13,4,5),(19,14,4,10),(20,14,5,5),(21,15,1,6),(22,15,2,3),(23,15,4,2),(24,15,5,1),(25,15,7,4),(26,16,1,2),(27,16,2,3),(28,17,1,10),(29,17,2,5),(30,17,4,10),(31,17,5,20),(32,17,7,10),(33,18,1,5),(34,18,2,11);
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `total` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(50) DEFAULT NULL,
  `delivery_address` text,
  `phone_number` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (3,1,131000.00,'2026-02-24 05:31:14','completed',NULL,NULL),(4,1,39000.00,'2026-02-24 05:48:19','completed',NULL,NULL),(5,1,30000.00,'2026-02-24 06:57:04','completed',NULL,NULL),(6,1,37000.00,'2026-02-24 07:00:52','completed',NULL,NULL),(7,1,30000.00,'2026-02-24 15:12:08','completed',NULL,NULL),(8,1,105000.00,'2026-02-24 07:15:17','completed',NULL,NULL),(9,1,30000.00,'2026-02-24 07:15:58','completed',NULL,NULL),(10,1,25000.00,'2026-02-24 07:16:35','awaiting_confirmation',NULL,NULL),(11,1,30000.00,'2026-02-24 15:17:02','completed',NULL,NULL),(12,1,300000.00,'2026-02-24 15:37:47','completed',NULL,NULL),(13,1,115000.00,'2026-02-24 15:46:55','completed',NULL,NULL),(14,1,170000.00,'2026-02-24 16:40:43','completed','高雄市路竹區中山路1821號','0970076250'),(15,5,334000.00,'2026-02-25 09:48:27','awaiting_confirmation','tainanshi ','0987783851'),(16,5,140000.00,'2026-02-25 09:49:29',NULL,'7-eleven','0123456789'),(17,14,1020000.00,'2026-02-25 14:33:16',NULL,'Thanh Hải- Thanh Hà - Hải Phòng\n','0003217888'),(18,1,455000.00,'2026-02-25 14:38:54',NULL,'Hải Phòng Việt Nam','0031355455');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'Đá viên 10kg',25000.00,'https://tse4.mm.bing.net/th/id/OIP.UD7-aoQyqpklqtT3P167kQHaFe?pid=Api&P=0&h=180'),(2,'Đá cây',30000.00,'https://tse3.mm.bing.net/th/id/OIP.dVNbxgvGIauLA7lp-PGRUAHaFj?pid=Api&P=0&h=180'),(4,'Đá viên 1kg',7000.00,'https://tse3.mm.bing.net/th/id/OIP.Hy_tIpoAleyjKnZJ-Q7OkwHaHa?pid=Api&P=0&h=180'),(5,'Đá bào',20000.00,'https://tse4.mm.bing.net/th/id/OIP.QOudfEYqVsaBEeuMfbzkTQHaFj?pid=Api&P=0&h=180'),(7,'Đá bi 5kg',15000.00,'http://localhost:3000/1771905108017-783181302.jpg');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` varchar(20) DEFAULT 'customer',
  `is_supervisor` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `email` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'nhan','$2b$10$0QAGHdTAblIJPpQkqjbJ7OvkEfy2.ZNlzAl1DumU30EUQFv8PopS.','customer',0,'2026-02-24 03:13:26',NULL),(2,'admin','$2b$10$FRGQoyllY0LgUE5JQE8w..olVpGxd2XxnIzZ3Wm4Bj1MsVUe.5SJq','admin',1,'2026-02-24 03:13:26','admin@gmail.com'),(5,'nhan1','$2b$10$jpFRyU4TeYIR1l1ov5wvCuUWQ83frAAYBC33PCEJmmnoulmwNVnQq','customer',0,'2026-02-24 03:13:26',NULL),(8,'nhan2','$2b$10$/hESbNzDeMPnxHB1p448JuHZEZ4evUMTaFqcbaEz2O4YEftDS4HzG','customer',0,'2026-02-24 03:52:13',NULL),(10,'nhan0','$2b$10$bAwC7PUa7reqrVQz1lYQ2OsaOUl8bc1FFmhRRWGyDyWmLUWWGeJfe','staff',0,'2026-02-24 09:26:29','nhan@gmail.com'),(11,'staff1','$2b$10$WYXlzFu/aNeVpIHPDUhp6uqF89Sk3Sgkc9f5WAj/c4cCvLDPwCQky','staff',0,'2026-02-25 01:32:36','staff1@gmail.com'),(12,'admin2','$2b$10$lGmWUeBlIx7kp9UkIIpt6uwVfh5D5oSYo4JArIysZ6xJ3ybxS2PXW','admin',1,'2026-02-25 01:33:29','admin2@gmail.com'),(14,'nhan3','$2b$10$0SEKp666K3zG/vfYVW19E.Xd2vg1Ubv5Sn3cUJiA47rWzw2G0Qm0K','customer',0,'2026-02-25 06:31:34',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-25 15:34:11
