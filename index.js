const express = require("express");
const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//New imports
const http = require("http").Server(app);
const cors = require("cors");

const { Novu } = require("@novu/node");
const novu = new Novu("a240766e253171d02cfacd6d43e1ab1d");

const socketIO = require("socket.io")(http, {
  cors: {
    origin: "https://kanban-dashboard-socket-io.netlify.app",
  },
});

//Add this before the app.get() block
socketIO.on("connection", (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);

  socket.on("taskDragged", (data) => {
    const { source, destination } = data;

    //👇🏻 Gets the item that was dragged
    const itemMoved = {
      ...tasks[source.droppableId].items[source.index],
    };
    // console.log("DraggedItem>>> ", itemMoved);

    //👇🏻 Removes the item from the its source
    tasks[source.droppableId].items.splice(source.index, 1);

    //👇🏻 Add the item to its destination using its destination index
    tasks[destination.droppableId].items.splice(
      destination.index,
      0,
      itemMoved
    );
    // console.log(`This is destination ${JSON.stringify(tasks)}`);

    //👇🏻 Sends the updated tasks object to the React app
    socket.emit("tasks", tasks);

    /* 👇🏻 Print the items at the Source and Destination
        console.log("Source >>>", tasks[source.droppableId].items);
        console.log("Destination >>>", tasks[destination.droppableId].items);
        */
  });
  // Create task "6342a75ae2a2de81dfe940de"
  const sendNotification = async (user) => {
    try {
      await novu.trigger("on-boarding-notification", {
        to: {
          subscriberId: "6342a75ae2a2de81dfe940de",
        },
        payload: {
          userId: user,
        },
      });
    } catch (err) {
      console.error("Error >>>>", { err });
    }
  };

  //👇🏻 The function is called after a new task is created
  socket.on("createTask", (data) => {
    const newTask = { id: fetchID(), title: data.task, comments: [] };
    tasks["pending"].items.push(newTask);
    socket.emit("tasks", tasks);
    //👇🏻 Triggers the notification via Novu
    sendNotification(data.userName);
  });

  socket.on("addComment", (data) => {
    const { category, userId, comment, id } = data;
    //👇🏻 Gets the items in the task's category
    const taskItems = tasks[category].items;
    //👇🏻 Loops through the list of items to find a matching ID
    for (let i = 0; i < taskItems.length; i++) {
      if (taskItems[i].id === id) {
        //👇🏻 Then adds the comment to the list of comments under the item (task)
        taskItems[i].comments.push({
          name: userId,
          text: comment,
          id: fetchID(),
        });
        //👇🏻 sends a new event to the React app
        socket.emit("comments", taskItems[i].comments);
      }
    }
  });

  socket.on("fetchComments", (data) => {
    const { category, id } = data;
    const taskItems = tasks[category].items;
    for (let i = 0; i < taskItems.length; i++) {
      if (taskItems[i].id === id) {
        socket.emit("comments", taskItems[i].comments);
      }
    }
  });

  socket.on("disconnect", () => {
    socket.disconnect();
    console.log("🔥: A user disconnected");
  });
});

app.use(cors());

//👇🏻 Generates a random string
const fetchID = () => Math.random().toString(36).substring(2, 10);

//👇🏻 Nested object
let tasks = {
  pending: {
    title: "pending",
    items: [
      {
        id: fetchID(),
        title: "Send the Figma file to Dima",
        comments: [],
      },
    ],
  },
  ongoing: {
    title: "ongoing",
    items: [
      {
        id: fetchID(),
        title: "Review GitHub issues",
        comments: [
          {
            name: "David",
            text: "Ensure you review before merging",
            id: fetchID(),
          },
        ],
      },
    ],
  },
  completed: {
    title: "completed",
    items: [
      {
        id: fetchID(),
        title: "Create technical contents",
        comments: [
          {
            name: "Dima",
            text: "Make sure you check the requirements",
            id: fetchID(),
          },
        ],
      },
    ],
  },
};

//👇🏻 host the tasks object via the /api route
app.get("/api", (req, res) => {
  res.json(tasks);
});

// app.get("/api", (req, res) => {
//   res.json({
//     message: "Hello world",
//   });
// });

http.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
