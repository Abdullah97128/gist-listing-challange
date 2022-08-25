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
    }

    const since = new Date().toISOString();
    if (userData) {
      //  Add Since param to req
      options.since = userData.since;

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

    const { data: gists } = await octokit.request('GET /users/{username}/gists', options)

    return res.json({ username, gists });
  } catch (error) {
    console.error('error ===>>>', error);
    if (error?.status === 404) {
      return res.status(error?.status).json({ error: "User not found" });
    } else if (error?.response?.data?.message) {
      return res.status(error?.status).json(error?.response?.data?.message);
    }
    return res.json({ error: 'Error occurred while loading data' })
  }
});

app.listen(PORT, () => {
  console.log(`Backend is running on http://localhost:${PORT}`)
})