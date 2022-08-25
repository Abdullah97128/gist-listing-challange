const express = require("express")
const cors = require("cors")
const lowDb = require("lowdb")
const FileSync = require("lowdb/adapters/FileSync")
const bodyParser = require("body-parser")
const { Octokit } = require("octokit");

const db = lowDb(new FileSync('db.json'))

db.defaults({ users: [] }).write()

const app = express()

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }));
const usersCollection = db.get("users")

const PORT = 4000;

const octokit = new Octokit()

app.get('/:username', async (req, res) => {
  const username = req.params.username;


  try {
    const user = usersCollection.find({ username })
    const userData = user.value();

    const options = {
      username,
      per_page: 100
    }

    const since = new Date().toISOString();
    if (userData)
      options.since = userData.since;


    // Load gists for user
    const { data: gists } = await octokit.request('GET /users/{username}/gists', options)

    if (userData) {
      // update user
      user.assign({ since }).value()
      usersCollection.write()
    } else {
      // Add new user
      usersCollection.push({
        username,
        since
      }).write()
    }

    return res.json({ username, gists });
  } catch (error) {
    if (error?.status === 404) {
      // Throw error if user not found
      return res.status(error?.status).json({ error: "User not found" });
    } else if (error?.response?.data?.message) {
      // Throw error if we have proper message to show
      return res.status(error?.status).json(error?.response?.data?.message);
    }
    // Throw General error
    return res.json({ error: 'Error occurred while loading data' })
  }
});

app.listen(PORT, () => {
  console.log(`Backend is running on http://localhost:${PORT}`)
})