import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./slices/authSlice";
import chatReducer from "./slices/chatSlice";
import messageReducer from "./slices/messageSlice";
import presenceReducer from "./slices/presenceSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    message: messageReducer,
    presence: presenceReducer,
  },
});

export default store;