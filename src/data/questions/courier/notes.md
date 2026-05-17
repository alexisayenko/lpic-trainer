# Courier — Study Notes

LPIC-2 Topic 211 (Email Services). Source: LKB LPIC-2. Courier.

## Overview

Courier is a unified mail server that integrates IMAP, POP3, and SMTP services
under a single server umbrella — useful when a single integrated solution is
required.

## Authentication

Courier provides an extensible authentication mechanism. When using MySQL for
authentication, `/etc/courier/authmysqlrc` defines the parameters for the MySQL
database: connection details, database name, table names, and queries.
