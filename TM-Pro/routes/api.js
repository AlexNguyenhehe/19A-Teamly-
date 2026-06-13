const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { requireLogin } = require('../middleware/auth');

router.use(requireLogin);

// GET /api/submissions/:taskId — fetch latest submission for a task
router.get('/submissions/:taskId', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT ts.*, u.display_name FROM task_submissions ts
       JOIN users u ON u.id = ts.user_id
       WHERE ts.task_id = $1 ORDER BY ts.submitted_at DESC LIMIT 1`,
      [req.params.taskId]
    );
    res.json({ submission: r.rows[0] || null });
  } catch (err) {
    res.json({ submission: null });
  }
});

// GET /api/projects/:id/stats
router.get('/projects/:id/stats', async (req, res) => {
  try {
    const pid = req.params.id;
    const [tasks, members] = await Promise.all([
      pool.query(`SELECT status, COUNT(*) FROM tasks WHERE project_id=$1 GROUP BY status`, [pid]),
      pool.query(`SELECT COUNT(*) FROM project_members WHERE project_id=$1 AND status='active'`, [pid])
    ]);
    const statusMap = {};
    tasks.rows.forEach(r => { statusMap[r.status] = parseInt(r.count); });
    res.json({
      total: Object.values(statusMap).reduce((a, b) => a + b, 0),
      done: statusMap.approved || 0,
      members: parseInt(members.rows[0].count)
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

module.exports = router;
