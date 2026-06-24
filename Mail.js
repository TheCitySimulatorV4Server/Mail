// LiteLoader-AIDS automatic generated
/// <reference path="../dts/HelperLib-master/src/index.d.ts"/>  

// ==================== 配置管理 ====================
const configPath = "./plugins/Mail/config.json";
const mailDataPath = "./plugins/Mail/mail_data.json";

// 初始化配置文件
const config = new JsonConfigFile(configPath, JSON.stringify({
    "version": "1.0.0",
    "defaultSettings": {
        notifications: true,
        autoDelete: "30天 Days"
    }
}));

// 初始化郵件數據文件
const mailDB = new JsonConfigFile(mailDataPath, JSON.stringify({
    "mails": {},
    "lastMailId": 0
}));

// ==================== 工具函數 ====================
class MailSystem {
    // 獲取玩家郵件設定
    static getPlayerSettings(xuid) {
        const settings = config.get(`settings.${xuid}`);
        return settings || config.get("defaultSettings");
    }
    
    // 保存玩家郵件設定
    static savePlayerSettings(xuid, settings) {
        return config.set(`settings.${xuid}`, settings);
    }
    
    // 獲取玩家郵件
    static getPlayerMails(xuid) {
        return mailDB.get(`mails.${xuid}`, []);
    }
    
    // 保存玩家郵件
    static savePlayerMails(xuid, mailList) {
        return mailDB.set(`mails.${xuid}`, mailList);
    }
    
    // 生成新郵件ID
    static generateMailId() {
        const currentId = mailDB.get("lastMailId", 0) + 1;
        mailDB.set("lastMailId", currentId);
        return currentId;
    }
    
    // 發送郵件
    static sendMail(sender, receiverXuid, title, content) {
        const mailList = this.getPlayerMails(receiverXuid);
        const mailId = this.generateMailId();
        
        const newMail = {
            id: mailId,
            sender: sender,
            receiver: receiverXuid,
            title: title,
            content: content,
            timestamp: Date.now(),
            read: false
        };
        
        mailList.unshift(newMail); // 新郵件放在最前面
        this.savePlayerMails(receiverXuid, mailList);
        
        // 通知接收者
        this.notifyNewMail(receiverXuid, sender, title);
        
        return mailId;
    }
    
    // 通知新郵件
    static notifyNewMail(receiverXuid, sender, title) {
        const settings = this.getPlayerSettings(receiverXuid);
        
        // 如果關閉通知則不發送
        if (!settings.notifications) return;
        
        // 查找在線玩家
        const player = mc.getPlayer(receiverXuid);
        if (player) {
            player.tell(tr(player, "mail.newMail", sender));
            // mc.runcmdEx(`playsound music.game.SE_Ringtone1 "${player.realName}"`);
        }
        // 如果不在線，將在登入時通知（在 onJoin 事件處理）
    }
    
    // 標記郵件為已讀
    static markAsRead(xuid, mailId) {
        const mailList = this.getPlayerMails(xuid);
        const mailIndex = mailList.findIndex(mail => mail.id === mailId);
        
        if (mailIndex !== -1) {
            mailList[mailIndex].read = true;
            this.savePlayerMails(xuid, mailList);
            return true;
        }
        return false;
    }
    
    // 刪除郵件
    static deleteMail(xuid, mailId) {
        const mailList = this.getPlayerMails(xuid);
        const newList = mailList.filter(mail => mail.id !== mailId);
        
        if (newList.length !== mailList.length) {
            this.savePlayerMails(xuid, newList);
            return true;
        }
        return false;
    }
    
    // 清理過期郵件
    static cleanOldMails(xuid) {
        const settings = this.getPlayerSettings(xuid);
        const mailList = this.getPlayerMails(xuid);
        
        if (settings.autoDelete === "永不 Never") return 0;
        
        const daysMap = {
            "7天 Days": 7,
            "14天 Days": 14,
            "30天 Days": 30,
            "90天 Days": 90
        };
        
        const days = daysMap[settings.autoDelete] || 30;
        const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
        
        const originalLength = mailList.length;
        const newList = mailList.filter(mail => mail.timestamp > cutoffTime);
        
        if (newList.length < originalLength) {
            this.savePlayerMails(xuid, newList);
            return originalLength - newList.length;
        }
        return 0;
    }
    
    // 檢查並通知未讀郵件
    static checkUnreadMails(player) {
        const xuid = player.xuid;
        const settings = this.getPlayerSettings(xuid);
        
        if (!settings.notifications) return;
        
        const mailList = this.getPlayerMails(xuid);
        const unreadCount = mailList.filter(mail => !mail.read).length;
        
        if (unreadCount > 0) {
            player.tell(tr(player, "mail.unreadMail", unreadCount));
            // mc.runcmdEx(`playsound music.game.SE_Ringtone1 "${player.realName}"`);
        }
        
        // 清理過期郵件
        const deletedCount = this.cleanOldMails(xuid);
        if (deletedCount > 0) {
            player.tell(tr(player, "mail.autoDelete", deletedCount));
        }
    }
}


i18n.load("./plugins/Mail/i18n.json", "zh_TW", {});

/**
* 翻譯模塊
* @param {string} partten 原句
* @param {any}
* @return {string}
*/
function tr(player, pattern, ...args) {
    let lang = "zh_TW";
    return i18n.trl(lang, pattern, ...args);
}

/**
 * 
 * @param {Player} player 
 * @param {Boolean} status 
 * @param {String} message 
 * @param {Function} callback 
 */
function SendModalFrom(player, status, message, callback) {
    player.sendModalForm(
        (status) ? tr(player, "form.notice") : tr(player, "form.error"),
        message,
        tr(player, "form.return"),
        tr(player, "form.cancel"),
        (pl, r) => {
            if (r == true) {
                callback(pl);
            }
        }
    );
}

// ==================== 表單構建函數 ====================
// 主菜單表單
function showMainMenu(player) {
    const form = mc.newSimpleForm()
        .setTitle(tr(player, "form.MainMenuTitle"))
        .addButton(tr(player, "form.MainMenuSendMail"), "textures/ui/book_edit_default.png")
        .addButton(tr(player, "form.MainMenuInbox"), "textures/ui/mail_icon.png")
        .addButton(tr(player, "form.MainMenuSettings"), "textures/ui/icon_setting.png");

    player.sendForm(form, (pl, id) => {
        if (id === null) return;
        
        switch(id) {
            case 0: // 撰寫郵件
                showComposeMailForm(pl);
                break;
            case 1: // 我的郵件
                showMailListForm(pl);
                break;
            case 2: // 郵箱設定
                showSettingsForm(pl);
                break;
        }
    });
}

/**
 * 撰寫郵件表單
 * @param {Player} player 
 */
function showComposeMailForm(player) {
    const form = mc.newCustomForm()
        .setTitle(tr(player, "form.SendMailTitle"))
        .addLabel(tr(player, "form.MailDescription"))
        .addInput(tr(player, "form.MailReceiver"), "alvinchan3028", "")
        .addInput(tr(player, "form.MailTitle"), tr(player, "form.MailTitlePlaceholder"), "")
        .addInput(tr(player, "form.MailContent"), tr(player, "form.MailContentPlaceholder"), "");
    
    player.sendForm(form, (pl, dt) => {
        if (dt === null || dt === undefined) {
            showMainMenu(pl); // 取消返回主菜單
            return;
        }
        
        const [useless, receiverName, title, content] = dt;
        
        // 驗證輸入
        if (!receiverName || receiverName.trim() === "") {
            SendModalFrom(pl, 0, tr(player, "error.EmptyReceiver"), showComposeMailForm);
            return;
        }
        
        if (!title || title.trim() === "") {
            SendModalFrom(pl, 0, tr(player, "error.EmptyTitle"), showComposeMailForm);
            return;
        }
        
        if (!content || content.trim() === "") {
            SendModalFrom(pl, 0, tr(player, "error.EmptyContent"), showComposeMailForm);
            return;
        }
        
        // 查找收件人XUID
        const receiverXuid = data.name2xuid(receiverName);
        if (!receiverXuid) {
            SendModalFrom(pl, 0, tr(player, "error.PlayerNotFound", receiverName), showComposeMailForm);
            return;
        }
        
        // 避免發給自己
        if (receiverXuid === pl.xuid) {
            SendModalFrom(pl, 0, tr(player, "error.SelfSend"), showComposeMailForm);
            showComposeMailForm(pl);
            return;
        }
        
        // 發送郵件
        try {
            const mailId = MailSystem.sendMail(pl.realName, receiverXuid, title, content);
            SendModalFrom(pl, 1, tr(player, "success.MailSent", receiverName, mailId), showMainMenu);
        } catch (error) {
            SendModalFrom(pl, 0, tr(player, "error.MailSendFailed", error.message), showComposeMailForm);
        }
    });
}

/**
 * 郵件列表表單
 * @param {Player} player 
 * @returns 
 */
function showMailListForm(player) {
    const mailList = MailSystem.getPlayerMails(player.xuid);
    
    const unreadCount = mailList.filter(mail => !mail.read).length;
    const form = mc.newSimpleForm()
        .setTitle(tr(player, "form.InboxTitle"))
        .setContent(tr(player, "form.InboxDescription", mailList.length, unreadCount));
    
    // 添加郵件按鈕
    mailList.forEach(mail => {
        const readIcon = mail.read ? tr(player, "form.read") : tr(player, "form.new");
        const buttonText = `§l${readIcon} §r§l${mail.title}§r\n${mail.sender}`;
        form.addButton(buttonText, "textures/items/paper");
    });
    
    form.addButton(tr(player, "form.return"), "textures/ui/arrow_dark_left_stretch.png");
    
    player.sendForm(form, (pl, id) => {
        if (id === null) {
            showMainMenu(pl);
            return;
        }
        
        if (id === mailList.length) {
            // 最後一個按鈕是返回
            showMainMenu(pl);
            return;
        }
        
        // 顯示選中的郵件
        showMailDetailForm(pl, mailList[id]);
    });
}

/**
 * 郵件詳情表單
 * @param {Player} player 
 * @param {*} mail 
 * @returns 
 */
function showMailDetailForm(player, mail) {
    if (!mail) return;
    // 標記為已讀
    MailSystem.markAsRead(player.xuid, mail.id);
    
    const date = new Date(mail.timestamp).toLocaleString();
    const form = mc.newSimpleForm()
        .setTitle(`§l${mail.title}`)
        .setContent(
            tr(player, "form.MailFrom", mail.sender) +
            tr(player, "form.MailDate", date) +
            tr(player, "form.MailID", mail.id) +
            tr(player, "form.MailContentHeader") +
            `${mail.content}\n\n\n\n\n`
        )
        .addButton(tr(player, "form.MailDetailReply"), "textures/ui/book_edit_default.png")
        .addButton(tr(player, "form.MailDetailDelete"), "textures/ui/book_trash_default.png")
        .addButton(tr(player, "form.return"), "textures/ui/arrow_dark_left_stretch.png");

    player.sendForm(form, (pl, id) => {
        switch(id) {
            case 0: // 回覆
                showReplyMailForm(pl, mail);
                break;
            case 1: // 刪除
                if (MailSystem.deleteMail(pl.xuid, mail.id)) {
                    SendModalFrom(pl, 1, tr(player, "success.MailDeleted"), showMailListForm);
                } else {
                    SendModalFrom(pl, 0, tr(player, "error.Deletefailed"), showMailListForm);
                }
                break;
            case 2: // 返回列表
                showMailListForm(pl);
                break;
            default:
                showMailListForm(pl);
        }
    });
}

// 回覆郵件表單
function showReplyMailForm(player, originalMail) {
    if (!originalMail) return;
    const form = mc.newCustomForm()
        .setTitle(tr(player, "form.MailReply"))
        .addLabel(tr(player, "form.MailReplyTo", originalMail.sender, originalMail.title))
        .addInput(tr(player, "form.MailReplyTitle"), `Re: ${originalMail.title}`, `Re: ${originalMail.title}`)
        .addInput(tr(player, "form.MailReplyContent"), tr(player, "form.MailReplyContentPlaceholder"), ``);

    player.sendForm(form, (pl, dt) => {
        if (dt === null || dt === undefined) {
            showMailListForm(pl);
            return;
        }
        
        const [useless, title, content] = dt;
        
        if (!content || content.trim() === "") {
            SendModalFrom(pl, 0, tr(player, "error.EmptyReply"), showMailListForm);
            return;
        }
        
        // 查找原發件人XUID
        const receiverXuid = data.name2xuid(originalMail.sender);
        if (!receiverXuid) {
            SendModalFrom(pl, 0, tr(player, "error.PlayerNotFound", originalMail.sender), showMailListForm);
            return;
        }
        
        // 發送回覆
        try {
            const mailId = MailSystem.sendMail(pl.realName, receiverXuid, title || `Re: ${originalMail.title}`, content);
            SendModalFrom(pl, 1, tr(player, "error.ReplySent", originalMail.sender, mailId), showMailListForm);
        } catch (error) {
            SendModalFrom(pl, 0, tr(player, "error.MailSendFailed", error.message), showMailListForm);
        }
    });
}

// 設定表單
function showSettingsForm(player) {
    const settings = MailSystem.getPlayerSettings(player.xuid);
    const autoDeleteOptions = ["7天 Days", "14天 Days", "30天 Days", "90天 Days", "永不 Never"];
    const currentDeleteIndex = autoDeleteOptions.indexOf(settings.autoDelete) || 2;
    
    const form = mc.newCustomForm()
        .setTitle(tr(player, "form.SettingsTitle"))
        .addSwitch(tr(player, "form.SettingsNotifications"), settings.notifications)
        .addDropdown(tr(player, "form.AutoDelete"), autoDeleteOptions, currentDeleteIndex);

    player.sendForm(form, (pl, dt) => {
        if (dt === null || dt === undefined) {
            showMainMenu(pl);
            return;
        }

        const [notifications, deleteIndex] = dt;
        const newSettings = {
            notifications: notifications,
            autoDelete: autoDeleteOptions[deleteIndex]
        };
        
        MailSystem.savePlayerSettings(pl.xuid, newSettings);
        SendModalFrom(pl, 1, tr(player, "success.SettingsSaved"), showMainMenu);
    });
}

// ==================== 事件監聽 ====================
// 玩家加入遊戲時檢查未讀郵件
mc.listen("onJoin", (player) => {
    setTimeout(() => {MailSystem.checkUnreadMails(player)}, 3000);

    // MailSystem.sendMail(
    //     "系統",
    //     player.xuid,
    //     "測試郵件",
    //     "這是由系統發送的測試郵件，切勿回覆。"
    // )
    
});

// ==================== 命令系統 ====================
mc.listen("onServerStarted", () => {
    let mailcmd = mc.newCommand("mail", "進入個人電子郵箱", PermType.Any);
    mailcmd.setCallback((cmd, ori, out, res) => {
        if (!ori.player) return;
        showMainMenu(ori.player); // 這裡調用主菜單函數
    });
    mailcmd.overload([]);
    mailcmd.setup();
});

function sendMail(sender, receiverXuid, title, content) {
    return MailSystem.sendMail(sender, receiverXuid, title, content);
}

ll.exports(sendMail, "Mail", "sendMail");

// ==================== 初始化完成消息 ====================
logger.info("Mail郵件插件系統已加載完成！");