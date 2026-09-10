import { useState } from "react";
import {Eye , EyeOff , MessageCircle} from "lucide-react";
import { Link , useNavigate } from "react-router-dom";
import { loginUser } from "../services/authService";
import { useAuth } from "../context/AuthContext";

function Login(){
    const [showPassword , setShowPassword] = useState(false);
    const navigate = useNavigate();
    const {login} = useAuth();

    const [identifier,setIdentifier ] = useState("");
    const [password, setPassword] = useState("");
    const [error , setError] = useState("");
    const [loading , setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const data = await loginUser({identifier,password,});
            login(data);

            navigate("/");
        } catch (error) {
            setError(
            error.response?.data?.message ||
            "Login failed. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };
    
    return(
        <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">

                <div className="flex justify-center mb-6">
                    <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center">
                        <MessageCircle className="text-white" size={28}/>
                    </div>
                </div>
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Welcome Back
                    </h1>
                    <p className="text-gray-500 mt-2">
                        Sign in to continue chatting
                    </p>
                </div>
                <form onSubmit={handleLogin} 
                      className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email or Username
                        </label>
                        <input type="text" 
                               value = {identifier}
                               onChange={(e)=> setIdentifier(e.target.value)}
                               placeholder="Enter your email or Username" 
                               className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-transpparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Passsword
                        </label>
                        <div className="relative">
                            <input type = {showPassword ? "text" : "password"}
                                   value = {password}
                                   onChange={(e)=> setPassword(e.target.value)}
                                   placeholder="Enter your password"
                                   className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                                {showPassword ? (
                                    <EyeOff size={20} />
                                ) : (
                                    <Eye size={20} />
                                )}
                            </button>
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                                {showPassword ? (<EyeOff size={20}/>) : (<Eye size={20}/>)}
                            </button>
                        </div>
                        {error && (
                            <p className="text-red-500 text-sm mt-2">
                                {error}
                            </p>
                        )}
                    </div>
                    <button type="submit"
                    disabled={loading}
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition"
                    >
                        Sign In
                    </button>
                </form>
                <p className="text-center text-sm text-gray-500 mt-6">
                    Dont'have an account?{" "}
                    <Link to="/signup"
                          className="text-green-600 font-semibold hover:underline">
                            Sign Up
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default Login;
