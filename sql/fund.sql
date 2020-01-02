/*
 Navicat MySQL Data Transfer

 Source Server         : ubuntu_mysql
 Source Server Type    : MySQL
 Source Server Version : 80018
 Source Schema         : fund

 Target Server Type    : MySQL
 Target Server Version : 80018
 File Encoding         : 65001

 Date: 02/01/2020 22:50:15
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for company
-- ----------------------------
DROP TABLE IF EXISTS `company`;
CREATE TABLE `company`  (
  `uid` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `id` char(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '基金公司id',
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '基金公司名称',
  `bid` char(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '基金公司BID（未知）',
  `updated_at` date NULL DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`uid`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for fund_daily_state
-- ----------------------------
DROP TABLE IF EXISTS `fund_daily_state`;
CREATE TABLE `fund_daily_state`  (
  `code` char(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '基金代码',
  `date` date NOT NULL COMMENT '日期',
  `value` decimal(12, 6) NULL DEFAULT NULL COMMENT '单位净值',
  `total_value` decimal(12, 6) NULL DEFAULT NULL COMMENT '累计净值',
  `bonus` decimal(12, 6) UNSIGNED ZEROFILL NULL DEFAULT NULL COMMENT '分红',
  `bonus_des` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分红描述',
  `redemption` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '开放赎回状态 【暂停，开放】',
  `purchase` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '开放申购状态  【暂停，开放，限大额】',
  `increase_rate` decimal(10, 6) NULL DEFAULT NULL COMMENT '日增长率',
  `raw_state` tinyint(1) NULL DEFAULT 0 COMMENT '原始数据中净值是否异常，1：异常，0：正常',
  `increase_rate_raw_state` tinyint(1) NULL DEFAULT 0 COMMENT '原始数据中增长率是否异常 1：异常，0：正常',
  `updated_at` datetime(0) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(0) COMMENT '更新时间',
  PRIMARY KEY (`code`, `date`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for fund_info
-- ----------------------------
DROP TABLE IF EXISTS `fund_info`;
CREATE TABLE `fund_info`  (
  `code` char(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '基金代码',
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '基金名称',
  `name_jp` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '基金名称简拼（拼音首字母）',
  `type_name` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '类型【混合型，股票型等】',
  `company_id` char(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '基金所属公司id',
  `updated_at` datetime(0) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(0) COMMENT '更新日期',
  `value_updated_at` date NULL DEFAULT '1970-01-01' COMMENT '最后净值日期',
  `raw_state` tinyint(1) NULL DEFAULT 0 COMMENT '原始数据是否异常，0：正常，1：异常',
  `start_at` date NULL DEFAULT NULL COMMENT '基金开始日期',
  PRIMARY KEY (`code`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for manager
-- ----------------------------
DROP TABLE IF EXISTS `manager`;
CREATE TABLE `manager`  (
  `uid` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `id` char(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '基金经理id',
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '基金经理名字',
  `company_id` char(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '基金公司id',
  `experience` int(11) NULL DEFAULT NULL COMMENT '累计从业时间（天数）',
  `current_asset` char(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '现任基金资产总规模（带单位字符串）',
  `current_best_return_rate_fund_code` char(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '现任基金最佳回报率基金代码',
  `current_best_return_rate` char(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '现任基金最佳回报率（百分比字符串）',
  `best_returen_rate` char(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '任职期间基金最佳回报率（百分比字符串）',
  `updated_at` date NULL DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`uid`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for r_manager_fund
-- ----------------------------
DROP TABLE IF EXISTS `r_manager_fund`;
CREATE TABLE `r_manager_fund`  (
  `uid` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `fund_code` char(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '基金码',
  `manager_id` char(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '基金经理id',
  `updated_at` date NULL DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`uid`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for test
-- ----------------------------
DROP TABLE IF EXISTS `test`;
CREATE TABLE `test`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL,
  `age` int(11) NULL DEFAULT NULL,
  `sex` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL,
  `f1` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL,
  `f2` time(6) NULL DEFAULT NULL,
  `f3` timestamp(6) NULL DEFAULT NULL,
  `d` decimal(10, 5) NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 188 CHARACTER SET = utf8 COLLATE = utf8_unicode_ci ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;
