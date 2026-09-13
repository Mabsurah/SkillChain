-- ============================================================
-- SKILLCHAIN MASTER DATABASE SETUP SCRIPT
-- Run this script in SQL Developer, SQLcl, or SQL*Plus:
-- @server/database/setup_all.sql
-- ============================================================

SET ECHO ON;
SET FEEDBACK ON;
SET SERVEROUTPUT ON;

PROMPT [1/3] Creating Database Tables and Constraints...
@@01_schema.sql

PROMPT [2/3] Inserting Dummy Data...
@@02_dummy_data.sql

PROMPT [3/3] Creating Abstract Datatypes, Views, Functions, Procedures, Cursors, and Triggers...
@@03_advanced_queries_and_plsql.sql

PROMPT ============================================================
PROMPT SKILLCHAIN DATABASE SETUP COMPLETED SUCCESSFULLY!
PROMPT ============================================================
