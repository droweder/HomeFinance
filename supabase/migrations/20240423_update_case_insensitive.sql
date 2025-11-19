CREATE OR REPLACE FUNCTION update_case_insensitive(
  table_name TEXT,
  column_name TEXT,
  old_values TEXT[],
  new_value TEXT
) RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I
     SET %I = %L
     WHERE lower(%I) = ANY(SELECT lower(unnest(%L::text[])))',
    table_name,
    column_name,
    new_value,
    column_name,
    old_values
  );
END;
$$ LANGUAGE plpgsql;