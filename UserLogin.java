import java.io.*;
import java.util.*;

public class UserLogin {
	public static void main(String[] args) throws Exception{
		try{ File file = new File("accounts.txt");
		Scanner scanner = new Scanner(System.in);
		boolean running = true;
		while (running){
	        System.out.println("Select option:\n\n1. Log into an account \n2. Create an account \n3. Exit");
		    int userChoice = scanner.nextInt();
	    	while(userChoice != 3) {
	    		
	    		//Login
		        if (userChoice == 1) {	
		    	    BufferedReader br = new BufferedReader(new FileReader(file));
		        	System.out.println("Username: ");
		        	String user = scanner.next();
		        	System.out.println("Password: ");
		        	String pass = scanner.next();
		        	String account = user + "," + pass;
		        	boolean found = br.lines().anyMatch(line -> line.equals(account));
		        	//Scans the text file by lines for a user input match
		        	if(found == true) {
		        		System.out.println("Logged in!");
		        		//this is where the other classes would be accessed in some way
		    	    }
		        	else {
		        		System.out.println("Invalid login credentials. Try again or create an account.");
		        		break;
		        	}
		        	br.close();
		        }
		        
		        //Create Account
		        else if (userChoice == 2) {
		        	FileWriter fw = new FileWriter(file, true);
		        	System.out.println("Username: ");
		        	String user = scanner.next();
		        	System.out.println("Password: ");
		        	String pass = scanner.next();
		        	String account = "\n" + user + "," + pass;
		    	    //converts user input into a string 
		    	    if(user.length() <= 15 && pass.length() <= 15) {
		    	    	fw.write(account);
		    	    	fw.flush();
			    	    //saves the string to a text file containing accounts
			    	    System.out.println("Account created successfully. Please log in.");
		    	    	break;
		    	    }
		    	    else {
		    	    	System.out.println("Username or password is too long (Max 15 chars). Try again.");
		    	    }
		    	    fw.close();
		        }
		        
		        //Exit
		        else if (userChoice == 3) {
		        	running = false;
		        }
		        
		        else {
			        System.out.println("Not an option. Try again");
			        break;
			        //restarts the program
		        }
	    	scanner.close();
		    }
	    } 
    }catch (FileNotFoundException e) {
        e.printStackTrace(); 
	}
}
}
