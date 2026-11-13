// Build genuine pre-v9 fixtures rather than simply changing user_version.
function removeClosing(db){db.exec('PRAGMA foreign_keys=OFF');for(const row of db.prepare("SELECT name,type FROM sqlite_master WHERE name LIKE 'closing_%' ORDER BY CASE type WHEN 'trigger' THEN 0 WHEN 'index' THEN 1 ELSE 2 END").all())db.exec(`DROP ${row.type.toUpperCase()} "${row.name}"`);}
module.exports={removeClosing};
