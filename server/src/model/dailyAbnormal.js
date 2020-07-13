export const create = `
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `daily_abnormal`;
CREATE TABLE `daily_abnormal`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` char(8) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL COMMENT '基金代码',
  `count` int(11) NULL DEFAULT NULL COMMENT '数量',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8 COLLATE = utf8_unicode_ci ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;
`
