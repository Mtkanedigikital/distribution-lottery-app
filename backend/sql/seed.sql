INSERT INTO prizes (id, name, result_time_jst, publish_time_utc)
VALUES ('A001','サンプル賞品A','2025-08-20 12:00+09','2025-08-20T03:00:00Z');

INSERT INTO entries (prize_id, entry_number, password, is_winner)
VALUES
('A001','001','1234', true),
('A001','002','5678', false);