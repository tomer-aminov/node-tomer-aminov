const express = require('express')
const cors = require('cors')
const fs = require('fs/promises')
const path = require('path')
const { v4: uuidv4 } = require('uuid')

const logger = require('./logger')
const validateTask = require('./validateTask')
const errorHandler = require('./errorHandler')

const app = express()
const PORT = process.env.PORT || 3000
const DATA_PATH = path.join(__dirname, 'tasks.json')

app.use(cors())
app.use(logger)
app.use(express.json())
app.use(express.static(path.join(__dirname, '..', 'client')))

async function readTasks() {
   try {
      const data = await fs.readFile(DATA_PATH, 'utf-8')
      return JSON.parse(data)
   } catch {
      return []
   }
}

async function writeTasks(tasks) {
   await fs.writeFile(DATA_PATH, JSON.stringify(tasks, null, 2))
}

app.post('/tasks', validateTask, async (req, res, next) => {
   try {
      const tasks = await readTasks()
      const newTask = {
         id: uuidv4(),
         title: req.body.title.trim(),
         description: req.body.description?.trim() || '',
         status: req.body.status,
         createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString()
      }
      tasks.push(newTask)
      await writeTasks(tasks)
      res.status(201).json(newTask)
   } catch (err) {
      next(err)
   }
})

app.get('/tasks', async (req, res, next) => {
   try {
      res.json(await readTasks())
   } catch (err) {
      next(err)
   }
})

app.get('/tasks/:id', async (req, res, next) => {
   try {
      const task = (await readTasks()).find((t) => t.id === req.params.id)
      if (!task) return res.status(404).json({ error: 'Task not found.' })
      res.json(task)
   } catch (err) {
      next(err)
   }
})

app.put('/tasks/:id', validateTask, async (req, res, next) => {
   try {
      const tasks = await readTasks()
      const idx = tasks.findIndex((t) => t.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Task not found.' })

      tasks[idx] = {
         ...tasks[idx],
         title: req.body.title.trim(),
         description: req.body.description?.trim() || '',
         status: req.body.status,
         updatedAt: new Date().toISOString()
      }
      await writeTasks(tasks)
      res.json(tasks[idx])
   } catch (err) {
      next(err)
   }
})

app.delete('/tasks/:id', async (req, res, next) => {
   try {
      const tasks = await readTasks()
      const filtered = tasks.filter((t) => t.id !== req.params.id)
      if (filtered.length === tasks.length)
         return res.status(404).json({ error: 'Task not found.' })

      await writeTasks(filtered)
      res.json({ message: 'Task deleted successfully.' })
   } catch (err) {
      next(err)
   }
})

app.use(errorHandler)

app.listen(PORT, () =>
   console.log(`Server listening on http://localhost:${PORT}`)
)
