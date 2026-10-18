# Workspace layout repair

The notification component rendered an in flow section directly inside the ERP grid. The grid placed that section in the first column, navigation in the second column and the workspace in the first column of the next row. This squeezed the workspace and expanded the navigation panel.

The notification live region now sits inside the workspace. Desktop navigation and workspace have explicit grid areas. Small screens have one workspace area with the desktop navigation hidden. Notification text uses Tahoma.

The regression test renders the real ERP and notification component for seven modules and three company views. It failed on the original structure because the notification section was an extra shell child. It verifies the corrected shell structure, accessible live region, explicit desktop areas and mobile area. Existing component and UI checks remain applicable.

This repair does not change imported source records, the journal, financial calculations or access policy. Browser layout and interaction QA could not be run because the supported browser capability is unavailable.
