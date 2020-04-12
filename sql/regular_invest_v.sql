/*
 Navicat MySQL Data Transfer

 Source Server         : ubuntu_mysql
 Source Server Type    : MySQL
 Source Server Version : 80018
 Source Host           : 127.0.0.1:3306
 Source Schema         : funds

 Target Server Type    : MySQL
 Target Server Version : 80018
 File Encoding         : 65001

 Date: 12/04/2020 14:55:41
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for regular_invest_v
-- ----------------------------
DROP TABLE IF EXISTS `regular_invest_v`;
CREATE TABLE `regular_invest_v`  (
  `code` char(8) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL COMMENT '基金代码',
  `shares` decimal(12, 6) NULL DEFAULT NULL COMMENT '持有的份额',
  `bonusShares` decimal(12, 6) NULL DEFAULT NULL COMMENT '分红再投资增加的份额',
  `cashBonus` decimal(12, 6) NULL DEFAULT NULL COMMENT '现金分红的收益',
  `start` date NOT NULL COMMENT '定投起始日期',
  `end` date NOT NULL COMMENT '定投结束日期',
  `regularCount` int(255) NULL DEFAULT NULL COMMENT '定投期数',
  `purchaseCount` int(255) NULL DEFAULT NULL COMMENT '实际定投期数',
  `referValue` decimal(12, 6) NULL DEFAULT NULL COMMENT '持有份额参考收益，当前的份额 * 下一个定投交易日的单位净值',
  `referBonusValue` decimal(12, 6) NULL DEFAULT NULL COMMENT '分红再投资增加的份额参考收益，当前的分红再投资增加的份额 * 下一个定投交易日的单位净值',
  `v1` decimal(12, 6) NULL DEFAULT NULL COMMENT '定投收益率粗算，(referValue - purchaseCount) / purchaseCount',
  `v2` decimal(12, 6) NULL DEFAULT NULL COMMENT '分红再投资定投收益率(referValue + referBonusValue - purchaseCount) / purchaseCount',
  `v3` decimal(12, 6) NULL DEFAULT NULL COMMENT '现金分红定投收益率(referValue + cashBonus - purchaseCount) / purchaseCount',
  PRIMARY KEY (`code`, `start`, `end`) USING BTREE,
  INDEX `s1`(`code`, `v1`, `v2`, `v3`) USING BTREE,
  INDEX `s2`(`code`, `start`, `end`) USING BTREE,
  INDEX `s3`(`code`, `regularCount`, `purchaseCount`) USING BTREE,
  INDEX `code`(`code`) USING BTREE,
  INDEX `purchaseCount`(`purchaseCount`) USING BTREE,
  INDEX `v3`(`v2`) USING BTREE,
  INDEX `v2`(`v3`) USING BTREE,
  INDEX `v1`(`v1`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_unicode_ci ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;
