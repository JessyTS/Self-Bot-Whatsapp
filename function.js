function verifLien(texte) {
    const regex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
    return regex.test(texte)
}

module.exports = {
    verifLien
}